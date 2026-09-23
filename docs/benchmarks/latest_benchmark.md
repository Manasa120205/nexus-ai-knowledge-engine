# NEXUS Benchmark Evaluation Results

- **Run ID:** `eval-run-e9c7225a`
- **Timestamp:** 2026-09-23T17:24:54.121544+00:00
- **Questions Evaluated:** 50

| Mode | Recall@5 | Precision@5 | MRR | nDCG@5 | Groundedness | Citation Acc | Retrieval (ms) | Total (ms) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **VECTOR** | 0.920 | 0.670 | 0.727 | 0.671 | 1.000 | 0.307 | 1.35 | 2.64 |
| **KEYWORD** | 0.920 | 0.670 | 0.857 | 0.696 | 1.000 | 0.357 | 0.13 | 0.81 |
| **HYBRID** | 0.920 | 0.670 | 0.790 | 0.683 | 1.000 | 0.320 | 0.83 | 1.43 |
| **RANKED** | 0.920 | 0.670 | 0.853 | 0.697 | 1.000 | 0.313 | 0.96 | 1.62 |


### Metric Definitions
- **Recall@5:** Fraction of queries where at least one ground-truth technical passage was retrieved in top 5.
- **Precision@5:** Ratio of retrieved chunks in top 5 matching expected core technical concepts.
- **MRR (Mean Reciprocal Rank):** Average reciprocal rank of the first relevant document.
- **nDCG@5:** Normalized Discounted Cumulative Gain accounting for position decay.
- **Groundedness:** Faithfulness score measuring proportion of claims substantiated by context.
- **Citation Accuracy:** Precision of generated citations matching the ground truth source document.
