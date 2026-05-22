# Hybrid Book Recommender Systems (Goodbooks-10k)

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![Jupyter](https://img.shields.io/badge/Jupyter-Notebook-orange.svg)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.11x-009688.svg)](https://fastapi.tiangolo.com/)
[![Streamlit](https://img.shields.io/badge/Streamlit-1.x-ff4b4b.svg)](https://streamlit.io/)
[![CatBoost](https://img.shields.io/badge/CatBoost-1.2%2B-F9E03C.svg)](https://catboost.ai/)
[![implicit](https://img.shields.io/badge/implicit-ALS-blueviolet.svg)](https://github.com/benfred/implicit)
[![Qdrant](https://img.shields.io/badge/Qdrant-Vector__DB-4b8bbe.svg)](https://qdrant.tech/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

This repository contains a **set of related recommender system projects** built around the Goodbooks-10k dataset:

- a **content-based recommender** (`Content_based/`),
- a **collaborative filtering recommender** (`Collaborative_filtering/`),
- a **production-style hybrid system** with FastAPI + Streamlit (`Hybrid_rec_sys/`).

The goal of the repo is to serve as a **portfolio project** that demonstrates:
- data exploration and feature engineering for books,
- content-based and collaborative approaches,
- a hybrid ranking model (CatBoost + ALS + text embeddings),
- integration into a simple web application (API + UI).

> **Important note**  
> This is a **demo / portfolio** repository.  
> Heavy training pipelines (SBERT embedding generation for millions of rows, full retraining of ALS and CatBoost, Qdrant collection snapshots, etc.) are **not** meant to be reproduced from this repo.  
> Large datasets and binary artifacts are intentionally excluded via `.gitignore`.  
> The code and notebooks document the approach and the working system that was run locally.
> An example and the appearance of the final application are located in the "screenshots" folder.

---

## Repository structure

At the top level:

```text
Rec_sys_project/
├─ Content_based/
│  └─ content_based.ipynb               # Jupyter notebook for pure content-based modeling
│
├─ Collaborative_filtering/
│  └─ collaborative_filter.ipynb        # Jupyter notebook for ALS-based collaborative filtering
│
├─ Hybrid_rec_sys/
│  ├─ api/
│  │  ├─ run.bat
│  │  └─ app/
│  │     ├─ main.py                     # FastAPI application (endpoints)
│  │     ├─ artifacts_loader.py         # Lazy loading of models & artifacts
│  │     ├─ rec_pipeline.py             # Hybrid recommendation pipeline
│  │     ├─ utils.py                    # Helper functions (text cleaning, similarity, etc.)
│  │     ├─ models.py                   # Pydantic request/response models
│  │     ├─ check_data.py               # Data verification
│  │     └─ logger.py                   # Logging setup
│  │
│  ├─ app/
│  │  └─ project/
│  │     ├─ streamlit_app.py            # Streamlit UI that talks to the FastAPI backend
│  │     ├─ logo.png
│  │     └─ .streamlit
│  │
│  ├─ hybrid_project.ipynb              # Notebook describing the hybrid pipeline
│  └─ screenshots                       # Screenshots of the running application
│
├─ LICENSE
├─ requirements.txt
├─ .gitignore
└─ README.md
```

Only **notebooks and Python source files** are tracked.  
All heavy artifacts (raw data, vectorized features, trained checkpoints, logs, mlruns, etc.) are excluded.

---

## Projects overview

### 1. Content-based recommender (`Content_based/`)

This part focuses on **content-based recommendations** using only book features:

- Jupyter notebook demonstrates:
  - cleaning and preprocessing of `books.csv` and genre information,
  - feature extraction from:
    - titles and authors (e.g. TF–IDF),
    - descriptions and genre text (TF–IDF / SBERT in the original local setup),
  - similarity-based recommendations (cosine similarity in embedding space),
  - simple content-based ranking.

The notebook serves as a **self-contained report** of the modeling steps and experiments for content-based methods.

---

### 2. Collaborative filtering (`Collaborative_filtering/`)

This part focuses on **collaborative filtering** using an **implicit feedback** matrix:

- Jupyter notebook demonstrates:
  - preparing a user–item interaction matrix from ratings / interactions,
  - training an ALS model (using the `implicit` library),
  - evaluating collaborative recommendations,
  - exploring how ALS factors capture similarity between books.

Again, the goal is to document the **modeling process and reasoning**, not to ship heavy artifacts.

---

### 3. Hybrid recommender with API + UI (`Hybrid_rec_sys/`)

This is the **main “production-style” part** of the project.

#### 3.1. Idea

The hybrid system combines:

- **Collaborative filtering** (ALS factors, popularity, clusters),
- **Content-based features** (text/genre embeddings and metadata),
- a **learning-to-rank model** (CatBoost) on top of these signals,
- a **simple serving stack** with FastAPI + Streamlit.

Training of the hybrid model was performed offline in notebooks (in this repo and locally).  
The code under `Hybrid_rec_sys/` focuses on how the trained components are **orchestrated and served**.

#### 3.2. FastAPI backend (`Hybrid_rec_sys/api/app/`)

Key modules:

- `main.py`  
  Defines the FastAPI application and endpoints, e.g.:

  - `GET /` – health/info,
  - `GET /genres` – available genres,
  - `POST /recommend` – returns hybrid recommendations as JSON,
  - `POST /recommend_csv` – same but as CSV,
  - `GET /popular` – popular / fallback recommendations for cold start.

- `artifacts_loader.py`  
  Central place that lazily loads trained artifacts and metadata, for example:

  - CatBoost ranking model (`catboost_final.cbm` in the original local setup),
  - ALS item factors and mapping,
  - precomputed features for books,
  - book metadata (titles, authors, genres, language, rating statistics).

- `rec_pipeline.py`  
  The core **hybrid ranking pipeline**:

  - builds candidate books for a given user/profile (from ALS and/or content-based similarity),
  - joins all necessary features (ALS scores & ranks, content-based similarity, clusters, popularity, metadata),
  - calls CatBoost to compute relevance scores,
  - returns top-N ranked recommendations.

- `utils.py`, `models.py`, `logger.py`, `check_data.py`  
  Helper functions, Pydantic models for request/response validation, logging configuration,
  and additional data validation utilities.

> All paths to large artifacts in the code are kept for reference,  
> but the actual files are not part of the public repo (see `.gitignore`).

#### 3.3. Streamlit UI (`Hybrid_rec_sys/app/project/streamlit_app.py`)

- Provides a **user-facing interface** for the hybrid recommender.
- Talks to the FastAPI backend via a configurable `API_URL`.
- Main features (in the original local setup):

  - form for specifying liked books / preferred genres,
  - buttons to generate recommendations,
  - visually styled cards for recommended books (title, author, rating, genres, etc.),
  - ability to download the recommendations as CSV.

This part demonstrates how the hybrid model can be exposed as a simple web application.

---

## What is intentionally ignored via `.gitignore`

To keep the repository compact and focused on **code and ideas**, the following are excluded:

- Python caches, virtual environments, IDE configs:

  ```gitignore
  __pycache__/
  *.pyc
  *.pyo
  .ipynb_checkpoints/
  .DS_Store

  .venv/
  venv/
  env/

  .idea/
  .vscode/
  *.log
  ```

- Large data and artifacts under `Content_based/`:

  ```gitignore
  Content_based/.ipynb_checkpoints/*
  Content_based/catboost_info/*
  Content_based/data/*
  Content_based/mlruns/*
  Content_based/raw/*
  Content_based/saved_models/*
  Content_based/vectorized/*
  Content_based/files/*
  ```

- Large data and artifacts under `Collaborative_filtering/`:

  ```gitignore
  Collaborative_filtering/.ipynb_checkpoints/*
  Collaborative_filtering/data/*
  Collaborative_filtering/files/*
  ```

- Large data and artifacts under `Hybrid_rec_sys/`:

  ```gitignore
  files/*
  Hybrid_rec_sys/als/*
  Hybrid_rec_sys/app/project/.idea*
  Hybrid_rec_sys/api/logs/*
  Hybrid_rec_sys/catboost_info/*
  Hybrid_rec_sys/data/*
  Hybrid_rec_sys/data1/*
  Hybrid_rec_sys/files/*
  Hybrid_rec_sys/raw/*
  Hybrid_rec_sys/scripts/*
  Hybrid_rec_sys/vectorized/*
  ```

These directories contain **big binary files, experiment logs or environment-specific configurations** from the original local development.  
They are not needed to understand or review the implementation.

---

## How to use this repository

This repo is primarily intended for:

- **reading and reviewing**:
  - the notebooks (`*.ipynb`) that document data analysis and modeling,
  - the Python code (FastAPI backend, hybrid pipeline, Streamlit UI),
- **showcasing**:
  - knowledge of recommender system design,
  - understanding of hybrid approaches (ALS + content + CatBoost),
  - practical skills with FastAPI and Streamlit.

If you want to experiment locally, you can:

1. Create a Python environment (e.g. `conda create -n recsys_env python=3.10`).
2. Install the required libraries from `requirements.txt` (or selectively).
3. Open notebooks in `Content_based/`, `Collaborative_filtering/` and `Hybrid_rec_sys/` to explore the modeling steps.
4. Inspect the code under `Hybrid_rec_sys/api/app/` and `Hybrid_rec_sys/app/project/` to see how the hybrid model is integrated into a web stack.

> Re-running the **full training pipeline** or reconstructing the original vector/database artifacts  
> is deliberately out of scope for this public version of the project.

---

## Possible future extensions

If this project were to be further developed or deployed, natural next steps would be:

- Add Dockerfiles and a `docker-compose.yml` to run:
  - FastAPI backend,
  - Streamlit UI,
  - a vector database (e.g. Qdrant) with preloaded embeddings.
- Provide a smaller, fully reproducible subset of the data (e.g. a few thousand users/books).
- Add monitoring and evaluation dashboards for recommendation quality.
- Extend the hybrid model with:
  - better user profiling,
  - temporal dynamics,
  - additional content features (e.g. reviews, tags).

For the purposes of a **portfolio project**, this repository already showcases:

- non-trivial feature engineering,
- hybrid recommender design,
- real-world model integration into an API + UI stack.
