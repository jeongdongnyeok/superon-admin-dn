import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import {
  TextField, Button, Box, Typography, MenuItem, Select, InputLabel, SelectChangeEvent
} from "@mui/material";
import axios from "axios";
import { supabase } from "../../../lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";

type CharactersFormState = {
  name: string;
  description: string;
  image_url?: string;
  perspective: string;
  appearance: string;
  country: string;
  age?: string;
  job?: string;
  gender?: string;
  tone?: string;
  taboo_topic?: string;
  background?: string;
  relationships?: string;
  current_location?: string;
  examples?: { input: string; response: string }[];
};

const initialState: CharactersFormState = {
  name: "",
  description: "",
  image_url: undefined,
  perspective: "",
  appearance: "",
  country: "",
  age: undefined,
  job: undefined,
  gender: undefined,
  tone: undefined,
  taboo_topic: undefined,
  background: undefined,
  relationships: undefined,
  current_location: undefined,
  examples: [],
};



export default function CharacterNewForm() {
  const router = useRouter();
  const [form, setForm] = useState<CharactersFormState>(initialState);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 필수 입력값 검증 (form 상태 반영)
  const requiredFields = [
    "name", "description", "perspective", "appearance", "country"
  ];
  const requiredFilled = useMemo(() =>
  requiredFields.every(field => {
    const value = form[field as keyof CharactersFormState];
    return typeof value === 'string' ? value.trim().length > 0 : !!value;
  }),
  [form, requiredFields]
);

  // imageUrl 동기화
  useEffect(() => {
    if (imageUrl && form.image_url !== imageUrl) {
      setForm(prev => ({ ...prev, image_url: imageUrl }));
    }
  }, [imageUrl, form.image_url]);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const { session } = data;
      if (session) {
        console.log("[Auth] Supabase session exists:", session);
        console.log("[Auth] User info:", session.user);
      } else {
        console.log("[Auth] No Supabase session. (Not logged in)");
      }
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // 단일 Select용 핸들러 (MUI SelectChangeEvent)
  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const name = e.target.name as string;
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!requiredFilled) {
      setError("필수 항목을 모두 입력해 주세요.");
      return;
    }
    if (!selectedFile) {
      setError("이미지 파일을 선택해 주세요.");
      return;
    }

    // 1. 캐릭터 DB insert
    const profile: Record<string, unknown> = {};
    ["age", "gender", "tone", "taboo_topic", "background", "relationships", "current_location", "examples", "perspective", "appearance", "country"].forEach(key => {
      const value = form[key as keyof CharactersFormState];
      if (Array.isArray(value) && value.length > 0) {
        profile[key] = value;
      } else if (typeof value === 'string' && value.trim().length > 0) {
        profile[key] = value;
      }
    });
    if (form.job && form.job.trim().length > 0) {
      profile.occupation = form.job;
    }
    const payload = {
      name: form.name,
      description: form.description,
      country: form.country,
      profile,
    };
    if (form.name.length > 50) {
      setError('이름은 50자 이내여야 합니다.');
      return;
    }
    if (form.description.length > 200) {
      setError('요약(설명)은 200자 이내여야 합니다.');
      return;
    }
    try {
      // 1. 캐릭터 생성 (id 반환)
      const res = await axios.post("http://localhost:8000/characters/create", payload, { withCredentials: true });
      if (res.data && res.data.id) {
        const newId = res.data.id;
        // 2. 이미지 업로드
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `images/${newId}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("character-assets").upload(filePath, selectedFile, { upsert: true });
        if (uploadError) {
          setError("이미지 업로드 실패: " + uploadError.message);
          return;
        }
        // 3. image_url DB update (백엔드 API로 요청)
        try {
          await axios.patch(`/api/characters/${newId}`, { image_url: filePath }, { withCredentials: true });
        } catch (err: unknown) {
          console.error("API image_url update error:", err);
          let msg = "DB 업데이트 실패";
          if (err instanceof Error) {
            msg = err.message;
          } else if (axios.isAxiosError(err)) {
            const data = err.response?.data;
            if (typeof data === "string") msg = data;
            else if (typeof data?.error === "string") msg = data.error;
            else if (typeof data?.detail === "string") msg = data.detail;
            else if (typeof data === "object") msg = JSON.stringify(data);
          }
          setError("DB 업데이트 실패: " + msg);
          return;
        }
        setSuccess("캐릭터와 이미지가 성공적으로 저장되었습니다!");
        setForm(initialState);
        setImageUrl("");
        setSelectedFile(null);
        // 성공 메시지 잠깐 보여주고 대시보드로 이동
        setTimeout(() => {
          router.push('/dashboard?tab=character');
        }, 1000);
      } else {
        setError("캐릭터 생성은 성공했으나, id를 반환받지 못했습니다.");
      }
    } catch (err: unknown) {
      let msg = "캐릭터 생성에 실패했습니다.";
      if (err instanceof Error) {
        msg = err.message;
      } else if (axios.isAxiosError(err)) {
        const data = err.response?.data;
        if (typeof data === "string") msg = data;
        else if (typeof data?.error === "string") msg = data.error;
        else if (typeof data?.detail === "string") msg = data.detail;
        else if (typeof data === "object") msg = JSON.stringify(data);
      }
      setError(msg);
    }
  };

  // 이미지 파일 선택 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (file) {
      setImageUrl(URL.createObjectURL(file));
    } else {
      setImageUrl("");
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 600, mx: "auto", p: 3 }}>
      <Typography variant="h5" gutterBottom>캐릭터 생성</Typography>
      {/* 캐릭터 이미지 업로드 */}
      <Box sx={{ mt: 2, mb: 2 }}>
        <Button
          variant="contained"
          component="label"
          color={selectedFile ? "success" : "primary"}
        >
          {selectedFile ? "이미지 선택 완료" : "이미지 선택"}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={handleFileChange}
          />
        </Button>
        {imageUrl && (
          <Box sx={{ mt: 2 }}>
            {/* Next.js Image 권장, 경고만 출력 */}
            <img src={imageUrl} alt="미리보기" style={{ maxWidth: 180, borderRadius: 8 }} />
          </Box>
        )}
      </Box>
      {/* 필수 입력 */}
      <TextField label="이름" name="name" value={form.name ?? ""} onChange={handleChange} fullWidth required margin="normal" InputLabelProps={{ required: true, sx: { "& .MuiFormLabel-asterisk": { color: "red" } } }} />
      <TextField label="요약 설명" name="description" value={form.description ?? ""} onChange={handleChange} fullWidth required margin="normal" InputLabelProps={{ required: true, sx: { "& .MuiFormLabel-asterisk": { color: "red" } } }} />
      <TextField label="관점/성격" name="perspective" value={form.perspective ?? ""} onChange={handleChange} fullWidth required margin="normal" InputLabelProps={{ required: true, sx: { "& .MuiFormLabel-asterisk": { color: "red" } } }} multiline minRows={3} />
      <TextField label="외형" name="appearance" value={form.appearance ?? ""} onChange={handleChange} fullWidth required margin="normal" InputLabelProps={{ required: true, sx: { "& .MuiFormLabel-asterisk": { color: "red" } } }} />
      <InputLabel id="country-label" sx={{ mt: 2 }}>언어국가 <span style={{ color: 'red' }}>*</span></InputLabel>
      <Select
        labelId="country-label"
        name="country"
        value={form.country ?? ""}
        onChange={handleSelectChange}
        fullWidth
        required
        displayEmpty
        sx={{ mb: 2 }}
      >
        <MenuItem value=""><em>언어 선택</em></MenuItem>
        <MenuItem value="korean">korean</MenuItem>
        <MenuItem value="english">english</MenuItem>
      </Select>
      <Typography variant="h6" sx={{ mt: 3 }}>선택 입력</Typography>
      <TextField label="나이" name="age" type="number" value={form.age ?? ""} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="직업" name="job" value={form.job ?? ""} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="성별" name="gender" value={form.gender ?? ""} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="감정적 톤" name="tone" value={form.tone ?? ""} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="금기 주제" name="taboo_topic" value={form.taboo_topic ?? ""} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="배경" name="background" value={form.background ?? ""} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="주요 관계" name="relationships" value={form.relationships ?? ""} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="현재 위치" name="current_location" value={form.current_location ?? ""} onChange={handleChange} fullWidth margin="normal" />

      {/* 에러/성공 메시지 */}
      {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
      {success && <Typography color="primary" sx={{ mt: 2 }}>{success}</Typography>}

    <Button 
      type="submit" 
      variant="contained" 
      color="primary" 
      fullWidth 
      sx={{ mt: 3 }}
      disabled={!requiredFilled}
    >
      캐릭터 생성
    </Button>
    {!requiredFilled && (
      <Typography color="error" sx={{ mt: 1, fontSize: 14 }}>
        모든 필수 항목(이미지, 이름, 국가, 나이, 직업, 외형, 세계관)을 입력해야 생성할 수 있습니다.
      </Typography>
    )}
  </Box>
  );
}