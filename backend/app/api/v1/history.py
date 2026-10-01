from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, delete, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.core.database import get_db
from backend.app.models.user import User
from backend.app.models.query import QueryRecord, QuerySource
from backend.app.schemas.history import QueryHistoryItem, QueryHistoryDetail
from backend.app.schemas.rag import Citation
from backend.app.security.auth import get_current_user

router = APIRouter(prefix="/history", tags=["Query History"])

DEMO_USER_ID = "3ccdcc89-d39c-4b6c-b2a9-05669881d0e5"


@router.get("/", response_model=List[QueryHistoryItem])
async def get_query_history(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve the authenticated user's query history in reverse chronological order."""
    stmt = (
        select(QueryRecord)
        .options(selectinload(QueryRecord.sources))
        .where(QueryRecord.user_id == current_user.id)
        .order_by(QueryRecord.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    records = result.scalars().all()

    # If the user has not asked questions yet, show sample knowledge base queries
    if not records and skip == 0:
        demo_stmt = (
            select(QueryRecord)
            .options(selectinload(QueryRecord.sources))
            .where(QueryRecord.user_id == DEMO_USER_ID)
            .order_by(QueryRecord.created_at.desc())
            .limit(limit)
        )
        demo_res = await db.execute(demo_stmt)
        records = demo_res.scalars().all()

    items = []
    for r in records:
        items.append(QueryHistoryItem(
            id=r.id,
            query_text=r.query_text,
            mode=r.mode,
            response_text=r.response_text,
            cache_hit=r.cache_hit,
            latency_ms=r.latency_ms,
            citations_count=len(r.sources),
            created_at=r.created_at,
        ))
    return items


@router.get("/{query_id}", response_model=QueryHistoryDetail)
async def get_query_detail(
    query_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full details and citations for a specific historical query."""
    stmt = (
        select(QueryRecord)
        .options(selectinload(QueryRecord.sources))
        .where(
            QueryRecord.id == query_id,
            or_(
                QueryRecord.user_id == current_user.id,
                QueryRecord.user_id == DEMO_USER_ID,
                QueryRecord.user_id == "system",
            ),
        )
    )
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Query record not found.")

    sources = [
        Citation(
            citation_index=s.citation_index,
            chunk_id=s.chunk_id,
            document_id=s.document_id,
            document_title="Technical Document",
            page_number=s.page_number,
            timestamp_seconds=s.timestamp_seconds,
            section=s.section,
            snippet=s.snippet,
            source_type="document",
        )
        for s in record.sources
    ]

    return QueryHistoryDetail(
        id=record.id,
        query_text=record.query_text,
        mode=record.mode,
        response_text=record.response_text,
        cache_hit=record.cache_hit,
        latency_ms=record.latency_ms,
        sources=sources,
        response_metadata=record.response_metadata or {},
        created_at=record.created_at,
    )


@router.delete("/{query_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_query(
    query_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a query record from history, enforcing user isolation."""
    stmt = select(QueryRecord).where(QueryRecord.id == query_id, QueryRecord.user_id == current_user.id)
    res = await db.execute(stmt)
    record = res.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Query record not found.")

    await db.delete(record)
    await db.commit()
    return None


@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
async def clear_all_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Clear all historical queries for current user."""
    stmt = delete(QueryRecord).where(QueryRecord.user_id == current_user.id)
    await db.execute(stmt)
    await db.commit()
    return None
