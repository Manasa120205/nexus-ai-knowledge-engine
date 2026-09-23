import uuid
import time
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.logging import logger
from backend.app.models.evaluation import EvaluationResult
from backend.app.schemas.evaluation import EvaluationMetricSummary, EvaluationResponse
from backend.app.evaluation.dataset import EVALUATION_DATASET
from backend.app.evaluation.metrics import (
    calculate_recall_at_k,
    calculate_precision_at_k,
    calculate_mrr,
    calculate_ndcg_at_k,
    calculate_groundedness,
    calculate_citation_accuracy,
)
from backend.app.retrieval.vector_store import vector_store
from backend.app.retrieval.keyword_search import bm25_engine
from backend.app.retrieval.hybrid import hybrid_retriever
from backend.app.retrieval.ranking import custom_ranker
from backend.app.rag.embeddings import embedding_service
from backend.app.rag.llm_provider import llm_service
from backend.app.rag.context_builder import context_builder


class BenchmarkEvaluator:
    """
    Automated evaluation engine that executes real queries against the system,
    measuring Vector, Keyword, Hybrid, and Custom Ranking modes with genuine IR metrics.
    """

    async def run_evaluation(
        self,
        db: Optional[AsyncSession] = None,
        modes: Optional[List[str]] = None,
        limit_questions: Optional[int] = None,
    ) -> EvaluationResponse:
        run_id = f"eval-run-{uuid.uuid4().hex[:8]}"
        eval_modes = modes or ["vector", "keyword", "hybrid", "ranked"]
        questions = EVALUATION_DATASET[:limit_questions] if limit_questions else EVALUATION_DATASET
        total_questions = len(questions)

        summaries: List[EvaluationMetricSummary] = []
        now = datetime.now(timezone.utc)

        for mode in eval_modes:
            mode_recall = []
            mode_precision = []
            mode_mrr = []
            mode_ndcg = []
            mode_groundedness = []
            mode_citation_acc = []
            mode_retrieval_latencies = []
            mode_total_latencies = []

            for q_item in questions:
                q_text = q_item["question"]
                exp_keywords = q_item["expected_relevant_content"].split()
                exp_source = q_item["expected_source"]

                t0 = time.perf_counter()
                retrieval_t0 = time.perf_counter()

                # Retrieve candidates based on mode
                candidates: List[Dict[str, Any]] = []
                if mode == "vector":
                    q_vec = await embedding_service.embed_query(q_text)
                    candidates = vector_store.search(query_vector=q_vec, top_k=5)
                elif mode == "keyword":
                    candidates = bm25_engine.search(query=q_text, top_k=5)
                elif mode == "hybrid":
                    candidates = await hybrid_retriever.retrieve(query=q_text, top_k=5)
                elif mode == "ranked":
                    initial = await hybrid_retriever.retrieve(query=q_text, top_k=10)
                    candidates = custom_ranker.rank_candidates(query=q_text, candidates=initial, top_k=5)
                else:
                    candidates = await hybrid_retriever.retrieve(query=q_text, top_k=5)

                retrieval_latency = (time.perf_counter() - retrieval_t0) * 1000.0

                # Extract chunk texts
                retrieved_texts = [
                    c.get("metadata", {}).get("text", "")
                    for c in candidates
                ]

                # Calculate IR Metrics
                rec = calculate_recall_at_k(retrieved_texts, exp_keywords, k=5)
                prec = calculate_precision_at_k(retrieved_texts, exp_keywords, k=5)
                mrr_val = calculate_mrr(retrieved_texts, exp_keywords)
                ndcg_val = calculate_ndcg_at_k(retrieved_texts, exp_keywords, k=5)

                # Context & LLM Generation check
                ctx_chunks = context_builder.build_context(candidates)
                llm_out = await llm_service.generate_grounded_answer(q_text, ctx_chunks)
                total_latency = (time.perf_counter() - t0) * 1000.0

                grounded_score = calculate_groundedness(llm_out["answer"], retrieved_texts)

                # Citation mock structure for metric
                citations = [
                    {"document_title": c.get("metadata", {}).get("document_title", "")}
                    for c in ctx_chunks
                ]
                cit_acc = calculate_citation_accuracy(citations, exp_source)

                mode_recall.append(rec)
                mode_precision.append(prec)
                mode_mrr.append(mrr_val)
                mode_ndcg.append(ndcg_val)
                mode_groundedness.append(grounded_score)
                mode_citation_acc.append(cit_acc)
                mode_retrieval_latencies.append(retrieval_latency)
                mode_total_latencies.append(total_latency)

            # Compute macro-averages
            avg_recall = sum(mode_recall) / total_questions if total_questions else 0.0
            avg_precision = sum(mode_precision) / total_questions if total_questions else 0.0
            avg_mrr = sum(mode_mrr) / total_questions if total_questions else 0.0
            avg_ndcg = sum(mode_ndcg) / total_questions if total_questions else 0.0
            avg_groundedness = sum(mode_groundedness) / total_questions if total_questions else 0.0
            avg_cit_acc = sum(mode_citation_acc) / total_questions if total_questions else 0.0
            avg_ret_lat = sum(mode_retrieval_latencies) / total_questions if total_questions else 0.0
            avg_tot_lat = sum(mode_total_latencies) / total_questions if total_questions else 0.0

            summary = EvaluationMetricSummary(
                mode=mode,
                recall_at_k=round(avg_recall, 4),
                precision_at_k=round(avg_precision, 4),
                mrr=round(avg_mrr, 4),
                ndcg=round(avg_ndcg, 4),
                groundedness_score=round(avg_groundedness, 4),
                citation_accuracy=round(avg_cit_acc, 4),
                retrieval_latency_ms=round(avg_ret_lat, 2),
                total_latency_ms=round(avg_tot_lat, 2),
                total_questions=total_questions,
            )
            summaries.append(summary)

            # Persist to database if session provided
            if db:
                eval_record = EvaluationResult(
                    run_id=run_id,
                    mode=mode,
                    recall_at_k=summary.recall_at_k,
                    precision_at_k=summary.precision_at_k,
                    mrr=summary.mrr,
                    ndcg=summary.ndcg,
                    groundedness_score=summary.groundedness_score,
                    citation_accuracy=summary.citation_accuracy,
                    retrieval_latency_ms=summary.retrieval_latency_ms,
                    total_latency_ms=summary.total_latency_ms,
                    total_questions=total_questions,
                    details={"samples_evaluated": total_questions},
                )
                db.add(eval_record)

        if db:
            try:
                await db.commit()
            except Exception as e:
                logger.error(f"Failed to persist evaluation run results: {e}")
                await db.rollback()

        return EvaluationResponse(
            run_id=run_id,
            created_at=now,
            summaries=summaries,
        )


benchmark_evaluator = BenchmarkEvaluator()
