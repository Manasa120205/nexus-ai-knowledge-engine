import os
import sys

# Ensure repository root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import asyncio
import json
from datetime import datetime, timezone
from backend.app.core.database import AsyncSessionLocal, init_db
from backend.app.evaluation.evaluator import benchmark_evaluator
from backend.app.core.logging import logger


async def run_benchmark():
    print("=" * 80)
    print("NEXUS — AUTOMATED IR & RAG BENCHMARK EVALUATOR")
    print("=" * 80)
    print("Initializing database and warming up search indices...")
    await init_db()

    async with AsyncSessionLocal() as session:
        from backend.app.retrieval import warmup_indices
        warmed = await warmup_indices(session)
        print(f"Indices warmed up with {warmed} chunks from database.")
        print("Running benchmark against Vector, Keyword, Hybrid, and Ranked modes across 50 questions...")
        response = await benchmark_evaluator.run_evaluation(
            db=session,
            modes=["vector", "keyword", "hybrid", "ranked"],
        )

        results_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "docs", "benchmarks"))
        os.makedirs(results_dir, exist_ok=True)

        # 1. Machine-readable JSON output
        json_path = os.path.join(results_dir, f"{response.run_id}.json")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(response.model_dump(mode="json"), f, indent=2)

        # 2. Human-readable Markdown Table
        md_path = os.path.join(results_dir, "latest_benchmark.md")
        md_content = f"# NEXUS Benchmark Evaluation Results\n\n"
        md_content += f"- **Run ID:** `{response.run_id}`\n"
        md_content += f"- **Timestamp:** {datetime.now(timezone.utc).isoformat()}\n"
        md_content += f"- **Questions Evaluated:** 50\n\n"
        md_content += "| Mode | Recall@5 | Precision@5 | MRR | nDCG@5 | Groundedness | Citation Acc | Retrieval (ms) | Total (ms) |\n"
        md_content += "| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n"

        for s in response.summaries:
            md_content += (
                f"| **{s.mode.upper()}** | {s.recall_at_k:.3f} | {s.precision_at_k:.3f} | "
                f"{s.mrr:.3f} | {s.ndcg:.3f} | {s.groundedness_score:.3f} | {s.citation_accuracy:.3f} | "
                f"{s.retrieval_latency_ms:.2f} | {s.total_latency_ms:.2f} |\n"
            )

        md_content += "\n\n### Metric Definitions\n"
        md_content += "- **Recall@5:** Fraction of queries where at least one ground-truth technical passage was retrieved in top 5.\n"
        md_content += "- **Precision@5:** Ratio of retrieved chunks in top 5 matching expected core technical concepts.\n"
        md_content += "- **MRR (Mean Reciprocal Rank):** Average reciprocal rank of the first relevant document.\n"
        md_content += "- **nDCG@5:** Normalized Discounted Cumulative Gain accounting for position decay.\n"
        md_content += "- **Groundedness:** Faithfulness score measuring proportion of claims substantiated by context.\n"
        md_content += "- **Citation Accuracy:** Precision of generated citations matching the ground truth source document.\n"

        with open(md_path, "w", encoding="utf-8") as f:
            f.write(md_content)

        print("\n" + md_content)
        print(f"Results saved to:\n  JSON: {json_path}\n  Markdown: {md_path}")
        print("=" * 80)


if __name__ == "__main__":
    asyncio.run(run_benchmark())
