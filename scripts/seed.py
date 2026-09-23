import os
import sys

# Ensure repository root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import asyncio
from datetime import datetime, timezone
from sqlalchemy import select
from backend.app.core.database import AsyncSessionLocal, init_db
from backend.app.models.user import User
from backend.app.models.evaluation import EvaluationQuestion
from backend.app.security.auth import hash_password
from backend.app.ingestion.pipeline import ingestion_pipeline
from backend.app.evaluation.dataset import EVALUATION_DATASET
from backend.app.core.logging import logger

DEMO_DOCUMENTS = [
    {
        "title": "Distributed Consensus and the Raft Algorithm",
        "source_type": "markdown",
        "content": """# Distributed Consensus and the Raft Algorithm

## Introduction to Consensus
Consensus algorithms allow a collection of machines to work as a coherent group that can survive the failures of some of its members. Raft is a consensus algorithm designed for understandability, equivalent to Paxos in fault-tolerance and performance.

## Leader Election
Raft uses a heartbeat mechanism to trigger leader election. Servers start in a follower state. A follower remains in follower state as long as it receives valid RPCs from a leader or candidate. Leaders send periodic heartbeats (AppendEntries RPCs that carry no log entries) to all followers to maintain their authority. If a follower receives no communication over a period of time called the election timeout, it assumes there is no viable leader and begins an election to choose a new leader.
Raft uses randomized election timeouts (typically 150-300ms) to ensure split votes are rare and resolved quickly.

## Log Replication
Once a leader has been elected, it begins servicing client requests. Each client request contains a command to be executed by the replicated state machines. The leader appends the command to its log as a new entry, then issues AppendEntries RPCs in parallel to each of the other servers to replicate the entry. When the entry has been safely replicated to a majority of servers, the leader applies the entry to its state machine and returns the result to the client.

## Safety and Committed Entries
Raft guarantees that if a leader has committed a log entry, that entry will be present in the logs of the leaders for all higher-numbered terms. A candidate must contact a majority of the cluster in order to be elected, which means that every committed entry must be present in at least one of those servers.
"""
    },
    {
        "title": "Database Internals: Storage Engines, WAL, and Indexing",
        "source_type": "markdown",
        "content": """# Database Internals: Storage Engines and Indexing

## Write-Ahead Logging (WAL)
In modern relational databases like PostgreSQL and SQLite, durability and atomicity are guaranteed using a Write-Ahead Log (WAL). Before any modification is made to a table or index page on disk, the change must be appended sequentially to the WAL.
If a crash occurs, the database replays the WAL from the last checkpoint to recover all committed transactions and roll back uncommitted work.

## B-Trees vs LSM Trees
Storage engines broadly fall into two architectures: update-in-place (B-Trees) and append-only (Log-Structured Merge-Trees).
B-Trees organize keys into balanced hierarchical pages. Reads and writes both traverse the tree, and updates overwrite pages in place. This provides predictable O(log N) point reads and range scans, but can cause write amplification due to random disk writes and page splits.
LSM Trees (used in RocksDB, Cassandra, and Bigtable) convert random writes into sequential writes. Incoming writes are stored in an in-memory sorted buffer called a Memtable. When full, the Memtable is flushed to disk as an immutable Sorted String Table (SSTable). Periodic compaction merges SSTables to remove obsolete values and tombstoned deletions.

## PostgreSQL Indexing and MVCC
PostgreSQL implements Multi-Version Concurrency Control (MVCC). When a row is updated, a new version (tuple) is inserted and the old tuple is marked dead. Over time, dead tuples cause table and index bloat until autovacuum or a manual REINDEX reclaims the empty physical pages.
"""
    },
    {
        "title": "Transformer Architectures and Modern Machine Learning",
        "source_type": "markdown",
        "content": """# Transformer Architectures and Modern Machine Learning

## Self-Attention Mechanism
The Transformer architecture relies on the scaled dot-product attention mechanism. Given input matrices Query (Q), Key (K), and Value (V), the attention weights are computed as:
Attention(Q, K, V) = softmax( (Q * K^T) / sqrt(d_k) ) * V
The scaling factor 1 / sqrt(d_k) prevents the dot products from growing excessively large in high dimensions, which would push the softmax function into regions with near-zero gradients.

## Layer Normalization
Unlike convolutional networks that utilize Batch Normalization across mini-batches, Transformers employ Layer Normalization (LayerNorm). LayerNorm computes mean and variance statistics across hidden feature channels independently for each sequence token. This eliminates dependence on batch size and enables training with dynamic, variable-length inputs.

## Overcoming Vanishing Gradients
Deep neural networks traditionally suffered from vanishing and exploding gradients during backpropagation. Transformers incorporate residual connections (x + Sublayer(x)) around every attention and feed-forward sublayer. These residual pathways provide uninterrupted gradient highways that propagate back to the earliest layers during optimization.
"""
    },
    {
        "title": "Information Retrieval, BM25, and Hybrid RAG Search",
        "source_type": "markdown",
        "content": """# Information Retrieval, BM25, and Hybrid RAG Search

## Inverted Indices and BM25
An inverted index maps terms in a vocabulary to the posting list of documents containing them. BM25 (Best Matching 25) is a probabilistic ranking function that improves upon standard TF-IDF by incorporating two key parameters:
1. k1 controls term frequency saturation. As term frequency increases, the relevance contribution plateaus.
2. b controls document length normalization, penalizing long documents that contain many incidental words.

## Vector Search and Embeddings
Dense embeddings encode the semantic meaning of sentences into high-dimensional vector spaces (e.g., 384 or 768 dimensions). Cosine similarity measures the angle between vectors, capturing semantic closeness even when the query and document share zero exact keywords. Hierarchical Navigable Small World (HNSW) graphs allow approximate nearest neighbor (ANN) retrieval in logarithmic time.

## Reciprocal Rank Fusion (RRF)
Hybrid search combines the high precision of keyword search (handling error codes, acronyms, and function names) with the semantic recall of dense vector search.
Reciprocal Rank Fusion (RRF) scores each document d across retrieval systems M:
RRF_score(d) = sum_{m in M} 1.0 / (k + rank_m(d))
where k is a smoothing constant (typically 60). Because RRF depends on rank order rather than raw score magnitudes, it seamlessly fuses disparate ranking scales without manual calibration.

## Groundedness in RAG
Retrieval-Augmented Generation (RAG) feeds retrieved context into an LLM to generate evidence-backed answers. Groundedness measures the faithfulness of the answer to the provided context, preventing hallucinations and verifying that all factual assertions link to valid source citations.
"""
    }
]


async def seed():
    logger.info("Initializing database schema...")
    await init_db()

    async with AsyncSessionLocal() as session:
        # 1. Create or get Demo User
        user_stmt = select(User).where(User.email == "demo@nexus.ai")
        demo_user = (await session.execute(user_stmt)).scalar_one_or_none()

        if not demo_user:
            demo_user = User(
                email="demo@nexus.ai",
                hashed_password=hash_password("password123"),
                full_name="NEXUS Demo User",
                is_active=True,
                is_superuser=True,
            )
            session.add(demo_user)
            await session.commit()
            await session.refresh(demo_user)
            logger.info("Created demo user: demo@nexus.ai / password123")
        else:
            logger.info("Demo user already exists.")

        # 2. Ingest Technical Documents
        for doc_info in DEMO_DOCUMENTS:
            logger.info(f"Ingesting seed document: '{doc_info['title']}'...")
            try:
                await ingestion_pipeline.ingest_document(
                    db=session,
                    user_id=demo_user.id,
                    title=doc_info["title"],
                    source_type=doc_info["source_type"],
                    raw_text=doc_info["content"],
                )
            except Exception as e:
                logger.warning(f"Seed doc ingestion note: {e}")

        # 3. Seed Evaluation Questions
        existing_q_count = (await session.execute(select(EvaluationQuestion))).scalars().all()
        if len(existing_q_count) < len(EVALUATION_DATASET):
            logger.info(f"Seeding {len(EVALUATION_DATASET)} technical evaluation questions...")
            for q in EVALUATION_DATASET:
                eq = EvaluationQuestion(
                    question=q["question"],
                    expected_source=q["expected_source"],
                    expected_relevant_content=q["expected_relevant_content"],
                    expected_answer=q["expected_answer"],
                    category=q.get("category", "General"),
                )
                session.add(eq)
            await session.commit()
            logger.info("Evaluation dataset seeded successfully.")
        else:
            logger.info("Evaluation dataset already populated.")

    logger.info("Seeding complete! NEXUS is populated with technical documents, users, and evaluation benchmark.")


if __name__ == "__main__":
    asyncio.run(seed())
