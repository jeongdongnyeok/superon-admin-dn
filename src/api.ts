import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000', // FastAPI 서버 주소/포트로 맞춤
  // withCredentials: true, // 필요시 주석 해제
});

export default api;
