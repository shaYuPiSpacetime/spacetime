from pydantic import BaseModel, Field
from typing import List, Optional, Union


class RecommendRequest(BaseModel):
    liked_books: List[str] = Field(..., description="Список любимых книг")
    liked_genres: List[str] = Field(default=[], description="Предпочтительные жанры")
    books_to_read: int = Field(default=5, ge=0, description="Сколько книг пользователь хочет прочитать")
    top_k: int = Field(default=10, ge=1, le=30, description="Сколько рекомендаций вернуть")
    excluded_books: Optional[List[int]] = Field(default=[], description="Список book_id, которые нужно исключить")


class Recommendation(BaseModel):
    book_id: int
    title: str
    score: float
    genres: Optional[str] = None
    image_url: Optional[str] = None
    rating: Union[float, str, None] = None
    metadata: Optional[str] = None


class RecommendResponse(BaseModel):
    recommendations: List[Recommendation]
    excluded_count: int
    matched_titles: Optional[List[str]] = []
