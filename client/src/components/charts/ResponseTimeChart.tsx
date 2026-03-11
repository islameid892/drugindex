import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ResponseTimeChartProps {
  data: Array<{
    hour: string;
    avgResponseTime?: number;
    minResponseTime?: number;
    maxResponseTime?: number;
  }>;
  avgResponseTime?: number;
  minResponseTime?: number;
  maxResponseTime?: number;
}

export function ResponseTimeChart({
  data,
  avgResponseTime = 0,
  minResponseTime = 0,
  maxResponseTime = 0,
}: ResponseTimeChartProps) {
  const chartData = useMemo(() => {
    // If we have hourly data, use it
    if (data && data.length > 0) {
      return {
        labels: data.map(d => d.hour?.split(' ')[1] || d.hour || ''),
        datasets: [
          {
            label: "Avg Response Time (ms)",
            data: data.map(d => d.avgResponseTime || 0),
            borderColor: "rgb(59, 130, 246)",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: "rgb(59, 130, 246)",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
          },
          {
            label: "Min Response Time (ms)",
            data: data.map(d => d.minResponseTime || 0),
            borderColor: "rgb(34, 197, 94)",
            backgroundColor: "rgba(34, 197, 94, 0.05)",
            fill: false,
            tension: 0.4,
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 3,
            pointBackgroundColor: "rgb(34, 197, 94)",
          },
          {
            label: "Max Response Time (ms)",
            data: data.map(d => d.maxResponseTime || 0),
            borderColor: "rgb(239, 68, 68)",
            backgroundColor: "rgba(239, 68, 68, 0.05)",
            fill: false,
            tension: 0.4,
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 3,
            pointBackgroundColor: "rgb(239, 68, 68)",
          },
        ],
      };
    }

    // Fallback: show summary metrics
    return {
      labels: ["Min", "Avg", "Max"],
      datasets: [
        {
          label: "Response Time (ms)",
          data: [minResponseTime, avgResponseTime, maxResponseTime],
          backgroundColor: [
            "rgba(34, 197, 94, 0.8)",
            "rgba(59, 130, 246, 0.8)",
            "rgba(239, 68, 68, 0.8)",
          ],
          borderColor: [
            "rgb(34, 197, 94)",
            "rgb(59, 130, 246)",
            "rgb(239, 68, 68)",
          ],
          borderWidth: 2,
        },
      ],
    };
  }, [data, avgResponseTime, minResponseTime, maxResponseTime]);

  return (
    <div className="w-full h-80">
      <Line
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top" as const,
              labels: {
                usePointStyle: true,
                padding: 15,
                font: {
                  size: 12,
                  weight: "500",
                },
              },
            },
            tooltip: {
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              padding: 12,
              titleFont: {
                size: 13,
                weight: "bold",
              },
              bodyFont: {
                size: 12,
              },
              callbacks: {
                label: function (context) {
                  return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}ms`;
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function (value) {
                  return `${value}ms`;
                },
              },
              title: {
                display: true,
                text: "Response Time (milliseconds)",
              },
            },
          },
        }}
      />
    </div>
  );
}
