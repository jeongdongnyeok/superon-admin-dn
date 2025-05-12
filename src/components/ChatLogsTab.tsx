import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button
} from '@mui/material';
import Grid from '@mui/material/Grid';
import dayjs, { Dayjs } from 'dayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

// Types
interface ChatLog {
  id: string;
  character_id: string;
  session_id: string;
  viewer_id: string;
  question: string;
  response: string;
  timestamp: string;
}

interface CharacterOption {
  id: string;
  name: string;
}

interface SessionOption {
  id: string;
}

const ChatLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [characters, setCharacters] = useState<CharacterOption[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch character list for filter
  useEffect(() => {
    fetch('http://localhost:8000/characters')
      .then(res => {
        if (!res.ok) throw new Error('FastAPI 서버에서 캐릭터 목록을 불러오지 못했습니다.');
        return res.json();
      })
      .then(data => setCharacters(data))
      .catch(() => setError('FastAPI 서버에서 캐릭터 목록을 불러오지 못했습니다.'));
  }, []);

  // Fetch session list for filter (filtered by character if selected)
  useEffect(() => {
    let url = 'http://localhost:8000/sessions';
    if (selectedCharacter) url += `?character_id=${selectedCharacter}`;
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('FastAPI 서버에서 세션 목록을 불러오지 못했습니다.');
        return res.json();
      })
      .then(data => setSessions(data))
      .catch(() => setError('FastAPI 서버에서 세션 목록을 불러오지 못했습니다.'));
  }, [selectedCharacter]);

  // Fetch chat logs
  const fetchLogs = () => {
    setLoading(true);
    setError(null);
    let url = 'http://localhost:8000/chat-logs?';
    if (selectedCharacter) url += `character_id=${selectedCharacter}&`;
    if (selectedSession) url += `session_id=${selectedSession}&`;
    if (selectedDate) url += `date=${selectedDate.format('YYYY-MM-DD')}&`;
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('FastAPI 서버에서 채팅 로그를 불러오지 못했습니다.');
        return res.json();
      })
      .then(data => setLogs(data))
      .catch(() => setError('FastAPI 서버에서 채팅 로그를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line
  }, [selectedCharacter, selectedSession, selectedDate]);

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>
        채팅 로그
      </Typography>
      <Box display="flex" flexWrap="wrap" gap={2} alignItems="center" mb={2}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>캐릭터</InputLabel>
          <Select
            value={selectedCharacter}
            label="캐릭터"
            onChange={e => {
              setSelectedCharacter(e.target.value);
              setSelectedSession('');
            }}
          >
            <MenuItem value="">전체</MenuItem>
            {characters.map(char => (
              <MenuItem key={char.id} value={char.id}>{char.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>세션</InputLabel>
          <Select
            value={selectedSession}
            label="세션"
            onChange={e => setSelectedSession(e.target.value)}
            disabled={!selectedCharacter}
          >
            <MenuItem value="">전체</MenuItem>
            {sessions.map(sess => (
              <MenuItem key={sess.id} value={sess.id}>{sess.id}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box>
          <DatePicker
            label="날짜"
            value={selectedDate}
            onChange={setSelectedDate}
            slotProps={{ textField: { size: 'small' } }}
          />
        </Box>
        <Button variant="outlined" onClick={fetchLogs} disabled={loading}>
          새로고침
        </Button>
      </Box>
      {error && (
        <Box mt={2}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}
      <Box mt={3}>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>캐릭터명</TableCell>
                <TableCell>사용자ID</TableCell>
                <TableCell>세션ID</TableCell>
                <TableCell>생성시간</TableCell>
                <TableCell>질문</TableCell>
                <TableCell>답변</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell>{characters.find(c => c.id === log.character_id)?.name || log.character_id}</TableCell>
                  <TableCell>{log.viewer_id}</TableCell>
                  <TableCell>{log.session_id}</TableCell>
                  <TableCell>{dayjs(log.timestamp).format('YYYY-MM-DD HH:mm')}</TableCell>
                  <TableCell>
                    <Card variant="outlined" sx={{ mb: 1 }}>
                      <CardContent sx={{ p: 1 }}>
                        <Typography variant="body2">{log.question}</Typography>
                      </CardContent>
                    </Card>
                  </TableCell>
                  <TableCell>
                    <Card variant="outlined" sx={{ mb: 1, bgcolor: '#f5f5f5' }}>
                      <CardContent sx={{ p: 1 }}>
                        <Typography variant="body2">{log.response}</Typography>
                      </CardContent>
                    </Card>
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    {loading ? '로딩 중...' : '데이터가 없습니다.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

export default ChatLogsTab;
