import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface HourlyActivityChartProps {
  data: Array<{
    hour: string;
    count: number;
  }>;
}

export function HourlyActivityChart({ data }: HourlyActivityChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    return {
      labels: data.map(d => {
        // Extract time from hour string (e.g., "2026-03-11 14:00:00" -> "14:00")
        const timePart = d.hour?.split(' ')[1];
        return timePart ? timePart.substring(0, 5) : d.hour;
      }),
      datasets: [
        {
          label: "Search Requests",
          data: data.map(d => d.count),
          backgroundColor: [
            "rgba(59, 130, 246, 0.8)",
            "rgba(34, 197, 94, 0.8)",
            "rgba(168, 85, 247, 0.8)",
            "rgba(236, 72, 153, 0.8)",
            "rgba(249, 115, 22, 0.8)",
          ],
          borderColor: [
            "rgb(59, 130, 246)",
            "rgb(34, 197, 94)",
            "rgb(168, 85, 247)",
            "rgb(236, 72, 153)",
            "rgb(249, 115, 22)",
          ],
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    };
  }, [data]);

  return (
    <div className="w-full h-80">
      <Bar
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: "x" as const,
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
                  return `Requests: ${context.parsed.y}`;
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1,
              },
              title: {
                display: true,
                text: "Number of Searches",
              },
            },
            x: {
              title: {
                display: true,
                text: "Hour (UTC)",
              },
            },
          },
        }}
      />
    </div>
  );
}
