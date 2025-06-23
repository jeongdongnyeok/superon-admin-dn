import React, { useRef, useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Button, Box, Typography, Alert } from "@mui/material";

interface Props {
  imageUrl: string | undefined;
  setImageUrl: (url: string) => void;
  characterId: string;
}

// 이미지 URL이 상대경로일 경우 /로 시작하도록 보정(강화)
function getImageSrc(url?: string | null) {
  if (!url || typeof url !== 'string' || url.trim() === '') return '/default.png';
  if (url.startsWith('http')) return url;
  const normalized = url.startsWith('/') ? url : '/' + url;
  if (!normalized.startsWith('/')) return '/default.png';
  return normalized;
}

export default function CharacterImageUpload({ imageUrl, setImageUrl, characterId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      setAuthChecked(true);
    });
  }, []);

  // imageUrl이 storage path일 때 signedUrl 생성해서 미리보기 띄우기
  useEffect(() => {
    const getSignedUrl = async () => {
      if (imageUrl && imageUrl.startsWith("images/")) {
        const { data: signedData } = await supabase.storage
          .from("character-assets")
          .createSignedUrl(imageUrl, 60 * 60);
        setPreviewUrl(signedData?.signedUrl || "");
      } else if (imageUrl && imageUrl.startsWith("http")) {
        setPreviewUrl(imageUrl);
      } else {
        setPreviewUrl("");
      }
    };
    getSignedUrl();
  }, [imageUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isLoggedIn) {
      alert("로그인 후 이미지를 업로드할 수 있습니다.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const fileExt = file.name.split('.').pop();
    const filePath = `images/${characterId}.${fileExt}`;
    const { error } = await supabase.storage.from("character-assets").upload(filePath, file, { upsert: true });
    if (error) {
      alert("이미지 업로드 실패: " + error.message);
      return;
    }

    // 1. DB에 image_url 업데이트
    const { error: dbError } = await supabase
      .from("characters")
      .update({ image_url: filePath })
      .eq("id", characterId);
    if (dbError) {
      alert("DB 업데이트 실패: " + dbError.message);
      return;
    }

    // 2. 업로드 후 storage path를 form에 저장
    setImageUrl(filePath);

    // 3. 미리보기용 signed URL도 생성
    const { data: signedData, error: signedError } = await supabase.storage
      .from("character-assets")
      .createSignedUrl(filePath, 60 * 60);
    if (!signedError && signedData?.signedUrl) {
      setPreviewUrl(signedData.signedUrl);
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1">캐릭터 이미지</Typography>
      <img src={getImageSrc(previewUrl)} alt="character" style={{ maxWidth: 200, display: "block", marginBottom: 8 }} />
      {!authChecked ? (
        <Typography color="text.secondary">인증 상태 확인 중...</Typography>
      ) : !isLoggedIn ? (
        <Alert severity="info">로그인 후 이미지를 업로드할 수 있습니다.</Alert>
      ) : (
        <Button variant="contained" component="label">
          이미지 업로드
          <input type="file" accept="image/*" hidden ref={inputRef} onChange={handleFileChange} />
        </Button>
      )}
    </Box>
  );
}
