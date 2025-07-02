import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || 'http://localhost:8000', // 환경변수 우선 사용
  // withCredentials: true, // 필요시 주석 해제
});

export default api;
