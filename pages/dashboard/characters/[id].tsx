import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { supabase } from "@/lib/supabaseClient";

import {
  Box, Typography, Button, TextField, InputLabel, Select, MenuItem, SelectChangeEvent
} from "@mui/material";

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

export default function CharacterEditPage() {
  const router = useRouter();
  const id = router.query.id as string | undefined;
  const [form, setForm] = useState<CharactersFormState>(initialState);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  // 필수 입력값 검증 (생성페이지와 동일)
  const requiredFilled = useMemo(() => {
    const requiredFields: (keyof CharactersFormState)[] = ["name", "description", "perspective", "appearance", "country"];
    return requiredFields.every(field => {
      const value = form[field];
      return typeof value === 'string' ? value.trim().length > 0 : !!value;
    });
  }, [form]);

  // 파일 선택 핸들러 (생성페이지와 동일)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (file) {
      setImageUrl(URL.createObjectURL(file));
    } else {
      setImageUrl("");
    }
  };


  // 입력 핸들러 (input, textarea, select 모두 지원)
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




  // 캐릭터 정보 불러오기
  useEffect(() => {
    if (!id) return;
    console.log('CharacterEditPage id:', id); // 디버깅용
    const fetchCharacter = async () => {
      try {
        const res = await axios.get(`/api/characters/${id}`, { withCredentials: true });
        const data = res.data;
        setForm({
          ...initialState,
          ...data,
          ...data.profile,
        });
        setImageUrl(data.image_url || "");
      } catch (err: unknown) {
        let errorMsg = "캐릭터 정보를 불러오지 못했습니다.";
        if (err && typeof err === "object" && "response" in err && err.response && typeof err.response === "object" && "data" in err.response) {
          const data = (err as { response?: { data?: unknown } }).response?.data;
          if (typeof data === "string") errorMsg = data;
          else if (data && typeof data === "object" && "error" in data && typeof (data as { error?: string }).error === "string") errorMsg = (data as { error?: string }).error ?? "";
else if (data && typeof data === "object" && "detail" in data && typeof (data as { detail?: string }).detail === "string") errorMsg = (data as { details?: string }).details ?? "";
          else if (typeof data === "object") errorMsg = JSON.stringify(data);
        } else if (err instanceof Error && err.message) {
          errorMsg = err.message;
        }
        setError(errorMsg);
      }
    };
    fetchCharacter();
  }, [id]);

  // 이미지 미리보기 URL 처리
  useEffect(() => {
    if (imageUrl && imageUrl.startsWith("images/")) {
      supabase.storage
        .from("character-assets")
        .createSignedUrl(imageUrl, 60 * 60)
        .then(({ data }) => setPreviewUrl(data?.signedUrl || ""));
    } else if (imageUrl && imageUrl.startsWith("http")) {
      setPreviewUrl(imageUrl);
    } else {
      setPreviewUrl("");
    }
  }, [imageUrl, router.query]);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const profile: Record<string, unknown> = {};
    ["age", "gender", "tone", "taboo_topic", "background", "relationships", "current_location", "examples", "perspective", "appearance", "country"].forEach(key => {
      const value = form[key as keyof CharactersFormState];
      if (Array.isArray(value) && value.length > 0) profile[key] = value;
      else if (typeof value === "string" && value.trim().length > 0) profile[key] = value;
    });
    if (form.job && form.job.trim().length > 0) profile.occupation = form.job;

    try {
      await axios.put(`/api/characters/${id}`, {
        name: form.name,
        description: form.description,
        country: form.country,
        profile,
      });
      setSuccess("캐릭터 정보가 성공적으로 수정되었습니다!");
      setTimeout(() => {
        router.push("/dashboard?tab=character");
      }, 1000);
    } catch (err: any) {
      let msg = "캐릭터 수정 실패";
      if (axios.isAxiosError(err)) {
        const data = err.response?.data;
        if (typeof data === "string") msg = data;
        else if (typeof data?.error === "string") msg = data.error;
        else if (typeof data?.detail === "string") msg = data.detail;
        else if (typeof data === "object") msg = JSON.stringify(data);
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 600, mx: "auto", p: 3 }}>
      <Typography variant="h5" gutterBottom>캐릭터 수정</Typography>
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
        {previewUrl && (
          <Box sx={{ mt: 2 }}>
            <img src={previewUrl} alt="미리보기" style={{ maxWidth: 180, borderRadius: 8 }} />
          </Box>
        )}
      </Box>
      {/* 필수 입력 */}
      <TextField label="이름" name="name" value={form.name ?? ""} onChange={handleChange} fullWidth required margin="normal" InputLabelProps={{ required: true, sx: { "& .MuiFormLabel-asterisk": { color: "red" } } }} />
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
        캐릭터 수정
      </Button>
      {!requiredFilled && (
        <Typography color="error" sx={{ mt: 1, fontSize: 14 }}>
          모든 필수 항목(이미지, 이름, 국가, 나이, 직업, 외형, 세계관)을 입력해야 수정할 수 있습니다.
        </Typography>
      )}
    </Box>
  )
}