"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

interface TimeInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChange: (value: string) => void;
}

const TimeInput = React.forwardRef<HTMLInputElement, TimeInputProps>(
  ({ value, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    };

    return (
      <Input
        type="time"
        value={value}
        onChange={handleChange}
        ref={ref}
        {...props}
      />
    );
  }
);
TimeInput.displayName = "TimeInput";

export { TimeInput };