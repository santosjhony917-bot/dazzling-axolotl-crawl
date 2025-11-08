"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SocialNetworkInputProps {
  platform: string;
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (platform: string, value: string) => void;
}

export function SocialNetworkInput({
  platform,
  label,
  icon,
  value,
  onChange,
}: SocialNetworkInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={platform} className="flex items-center gap-2">
        {icon} {label}
      </Label>
      <Input
        id={platform}
        value={value}
        onChange={(e) => onChange(platform, e.target.value)}
        placeholder={`https://...`}
      />
    </div>
  );
}