import { useState } from 'react';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function useComponentShowcaseState() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [datePickerDate, setDatePickerDate] = useState<Date>();
  const [selectedFruits, setSelectedFruits] = useState<string[]>([]);
  const [progress, setProgress] = useState(33);
  const [currentPage, setCurrentPage] = useState(2);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [dialogInput, setDialogInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { role: "system", content: "You are a helpful assistant." },
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  return {
    date,
    setDate,
    datePickerDate,
    setDatePickerDate,
    selectedFruits,
    setSelectedFruits,
    progress,
    setProgress,
    currentPage,
    setCurrentPage,
    openCombobox,
    setOpenCombobox,
    selectedFramework,
    setSelectedFramework,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    dialogInput,
    setDialogInput,
    dialogOpen,
    setDialogOpen,
    chatMessages,
    setChatMessages,
    isChatLoading,
    setIsChatLoading,
  };
}
