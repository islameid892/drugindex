import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MetricsModal } from "@/components/MetricsModal";

export default function Metrics() {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    // If modal is closed, navigate back to home
    if (!open) {
      navigate("/");
    }
  }, [open, navigate]);

  return (
    <MetricsModal
      open={open}
      onOpenChange={setOpen}
    />
  );
}
