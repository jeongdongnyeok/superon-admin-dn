from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from backend.db import Base

class CharacterMotion(Base):
    __tablename__ = 'character_motions'
    id = Column(Integer, primary_key=True, index=True)
    character_id = Column(Integer, ForeignKey('characters.id'))
    tag = Column(String, index=True)  # 예: '웃음', '슬픔', '기쁨', '점프', ...
    video_url = Column(String)
    audio_url = Column(String)

    # 관계 설정 (옵션)
    # character = relationship('Character', back_populates='motions')
