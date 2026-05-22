'use client';

import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface DonutChartProps {
  aTime: number;
  tardio: number;
  noRealizada: number;
  colorATime: string;
  colorTardio: string;
  colorNoRealizada: string;
}

export default function DonutChart({
  aTime, tardio, noRealizada,
  colorATime, colorTardio, colorNoRealizada,
}: DonutChartProps) {
  const data = {
    labels: ['A tiempo', 'Tardío', 'No realizada'],
    datasets: [
      {
        data: [aTime, tardio, noRealizada],
        backgroundColor: [colorATime, colorTardio, colorNoRealizada],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const options = {
    cutout: '65%',
    animation: { animateRotate: true, duration: 900 },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { label: string; raw: unknown }) => ` ${ctx.label}: ${ctx.raw}%`,
        },
      },
    },
    responsive: true,
    maintainAspectRatio: true,
  };

  return (
    <div className="w-36 h-36 mx-auto">
      <Doughnut data={data} options={options} />
    </div>
  );
}
