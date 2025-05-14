
import React, { useState } from "react";
import {
  TextField, Button, Box, Typography, Chip, MenuItem, Select, InputLabel, FormHelperText
} from "@mui/material";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";

type CharacterFormState = {
  name: string;
  age: string;
  occupation: string;
  appearance: string;
  setting: string;
  era: string;
  character_position: string;
  core_traits: string[];
  vocabulary_level: string;
  language_formality: string;
  gender: string;
  background: string;
  world_description: string;
  world_rules: string;
  style: string;
  perspective: string;
  tone: string;
  speech_patterns: string;
  catchphrases: string;
  taboo_topics: string;
  personal_history: string;
  relationships: string;
  current_location: string;
  emotional_state: string;
  current_objectives: string;
};

const initialState: CharacterFormState = {
  name: "",
  age: "",
  occupation: "",
  appearance: "",
  setting: "",
  era: "",
  character_position: "",
  core_traits: [],
  vocabulary_level: "",
  language_formality: "",
  gender: "",
  background: "",
  world_description: "",
  world_rules: "",
  style: "",
  perspective: "",
  tone: "",
  speech_patterns: "",
  catchphrases: "",
  taboo_topics: "",
  personal_history: "",
  relationships: "",
  current_location: "",
  emotional_state: "",
  current_objectives: "",
};

const traitOptions = ["용감함", "친절함", "지혜로움", "유머러스함", "성실함", "냉정함"];

const requiredFields = [
  "name", "age", "occupation", "appearance", "setting", "era",
  "character_position", "core_traits", "vocabulary_level", "language_formality"
];

export default function CharacterNewForm() {
  const [form, setForm] = useState<CharacterFormState>(initialState);
  const [coreTraitInput, setCoreTraitInput] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // 필수 입력 체크
  const requiredFilled =
    form.name &&
    form.age &&
    form.occupation &&
    form.appearance &&
    form.setting &&
    form.era &&
    form.character_position &&
    form.core_traits.length >= 2 &&
    form.vocabulary_level &&
    form.language_formality;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // core_traits 추가/삭제
  const handleAddTrait = () => {
    if (coreTraitInput && !form.core_traits.includes(coreTraitInput)) {
      setForm((prev) => ({
        ...prev,
        core_traits: [...prev.core_traits, coreTraitInput],
      }));
      setCoreTraitInput("");
    }
  };
  const handleDeleteTrait = (trait: string) => {
    setForm((prev) => ({
      ...prev,
      core_traits: prev.core_traits.filter((t) => t !== trait),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!requiredFilled) {
      setError("필수 항목을 모두 입력해 주세요.");
      return;
    }

    // API payload 구조 맞추기
    const payload = {
      character_id: uuidv4(),
      name: form.name,
      world: {
        setting: form.setting,
        era: form.era,
        character_position: form.character_position,
        world_description: form.world_description,
        world_rules: form.world_rules,
      },
      profile: {
        age: Number(form.age),
        occupation: form.occupation,
        appearance: form.appearance,
        gender: form.gender,
        background: form.background,
        personality: {
          core_traits: form.core_traits,
          style: form.style,
          perspective: form.perspective,
          tone: form.tone,
          speech_patterns: form.speech_patterns,
          catchphrases: form.catchphrases,
          taboo_topics: form.taboo_topics,
        },
        speech_pattern: {
          vocabulary_level: form.vocabulary_level,
          language_formality: form.language_formality,
        },
        personal_history: form.personal_history,
        relationships: form.relationships,
        current_location: form.current_location,
        emotional_state: form.emotional_state,
        current_objectives: form.current_objectives,
      },
    };

    try {
      await axios.post("/api/character", payload);
      setSuccess("캐릭터가 성공적으로 생성되었습니다!");
      setForm(initialState);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "캐릭터 생성에 실패했습니다.");
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 600, mx: "auto", p: 3 }}>
      <Typography variant="h5" gutterBottom>캐릭터 생성</Typography>
      {/* 필수 입력 */}
      <TextField label="이름" name="name" value={form.name} onChange={handleChange} fullWidth required margin="normal" InputLabelProps={{ required: true, sx: { "& .MuiFormLabel-asterisk": { color: "red" } } }} />
      <TextField label="나이" name="age" type="number" value={form.age} onChange={handleChange} fullWidth required margin="normal" InputLabelProps={{ required: true, sx: { "& .MuiFormLabel-asterisk": { color: "red" } } }} />
      <TextField label="직업" name="occupation" value={form.occupation} onChange={handleChange} fullWidth required margin="normal" InputLabelProps={{ required: true, sx: { "& .MuiFormLabel-asterisk": { color: "red" } } }} />
      <TextField label="외형" name="appearance" value={form.appearance} onChange={handleChange} fullWidth required margin="normal" InputLabelProps={{ required: true, sx: { "& .MuiFormLabel-asterisk": { color: "red" } } }} />
      <TextField label="세계관" name="setting" value={form.setting} onChange={handleChange} fullWidth required margin="normal" InputLabelProps={{ required: true, sx: { "& .MuiFormLabel-asterisk": { color: "red" } } }} />
      <TextField label="시대" name="era" value={form.era} onChange={handleChange} fullWidth required margin="normal" InputLabelProps={{ required: true, sx: { "& .MuiFormLabel-asterisk": { color: "red" } } }} />
      <TextField label="세계 내 위치/역할" name="character_position" value={form.character_position} onChange={handleChange} fullWidth required margin="normal" InputLabelProps={{ required: true, sx: { "& .MuiFormLabel-asterisk": { color: "red" } } }} />
      {/* core_traits (최소 2개) */}
      <Box sx={{ my: 2 }}>
        <InputLabel>성격 특성 <span style={{ color: 'red' }}>*</span> (최소 2개)</InputLabel>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Select
            value={coreTraitInput}
            onChange={(e) => setCoreTraitInput(e.target.value as string)}
            displayEmpty
            sx={{ minWidth: 120 }}
          >
            <MenuItem value=""><em>선택</em></MenuItem>
            {traitOptions.map((option) => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </Select>
          <Button onClick={handleAddTrait} disabled={!coreTraitInput || form.core_traits.includes(coreTraitInput)}>추가</Button>
        </Box>
        <Box sx={{ mt: 1 }}>
          {form.core_traits.map((trait) => (
            <Chip key={trait} label={trait} onDelete={() => handleDeleteTrait(trait)} sx={{ mr: 1 }} />
          ))}
        </Box>
        {form.core_traits.length < 2 && (
          <FormHelperText error>최소 2개 이상 입력 필요</FormHelperText>
        )}
      </Box>
      <TextField label="어휘 수준" name="vocabulary_level" value={form.vocabulary_level} onChange={handleChange} fullWidth required margin="normal" InputLabelProps={{ required: true, sx: { "& .MuiFormLabel-asterisk": { color: "red" } } }} />
      <TextField label="언어 격식" name="language_formality" value={form.language_formality} onChange={handleChange} fullWidth required margin="normal" InputLabelProps={{ required: true, sx: { "& .MuiFormLabel-asterisk": { color: "red" } } }} />

      {/* 선택 입력 */}
      <Typography variant="h6" sx={{ mt: 3 }}>선택 입력</Typography>
      <TextField label="성별" name="gender" value={form.gender} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="배경" name="background" value={form.background} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="세계관 상세 설명" name="world_description" value={form.world_description} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="세계의 규칙" name="world_rules" value={form.world_rules} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="커뮤니케이션 스타일" name="style" value={form.style} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="관점" name="perspective" value={form.perspective} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="감정적 톤" name="tone" value={form.tone} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="말투/특징" name="speech_patterns" value={form.speech_patterns} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="자주 쓰는 말/유행어" name="catchphrases" value={form.catchphrases} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="금기 주제" name="taboo_topics" value={form.taboo_topics} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="개인사" name="personal_history" value={form.personal_history} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="주요 관계" name="relationships" value={form.relationships} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="현재 위치" name="current_location" value={form.current_location} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="현재 감정 상태" name="emotional_state" value={form.emotional_state} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="현재 목표" name="current_objectives" value={form.current_objectives} onChange={handleChange} fullWidth margin="normal" />

      {/* 에러/성공 메시지 */}
      {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
      {success && <Typography color="primary" sx={{ mt: 2 }}>{success}</Typography>}

      <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 3 }} disabled={!requiredFilled}>
        캐릭터 생성
      </Button>
    </Box>
  );
}
