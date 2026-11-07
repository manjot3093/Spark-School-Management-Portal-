import React from 'react';
import { useTheme } from '../../context/themeState';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartData {
  labels: string[];
  datasets: {
    label?: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
    tension?: number;
  }[];
}

interface ChartProps {
  type: 'line' | 'bar' | 'doughnut' | 'pie';
  data: ChartData;
  title?: string;
  height?: number;
  width?: number;
}

export const Chart: React.FC<ChartProps> = ({ type, data, title, height = 300, width }) => {
  const { theme } = useTheme();
  const textColor = theme === 'dark' ? '#c2d0e7' : '#536782';
  const gridColor = theme === 'dark' ? '#35465e' : '#e7edf5';
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: textColor, usePointStyle: true, boxWidth: 8 },
      },
      title: {
        display: !!title,
        text: title,
        color: textColor,
      },
    },
    scales: type !== 'doughnut' && type !== 'pie' ? {
      x: { grid: { display: false }, ticks: { color: textColor, maxRotation: 30 } },
      y: {
        beginAtZero: true,
        ticks: { color: textColor },
        grid: { color: gridColor },
      },
    } : undefined,
  };

  const renderChart = () => {
    switch (type) {
      case 'line':
        return <Line data={data} options={options} height={height} width={width} />;
      case 'bar':
        return <Bar data={data} options={options} height={height} width={width} />;
      case 'doughnut':
        return <Doughnut data={data} options={options} height={height} width={width} />;
      case 'pie':
        return <Pie data={data} options={options} height={height} width={width} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ position: 'relative', height, width: width || '100%', maxWidth: '100%', minWidth: 0 }} role="img" aria-label={title || `${type} chart`}>
      {renderChart()}
    </div>
  );
};

// Predefined color schemes
export const chartColors = {
  primary: ['#3B82F6', '#1D4ED8', '#1E40AF', '#1E3A8A'],
  success: ['#10B981', '#059669', '#047857', '#065F46'],
  warning: ['#F59E0B', '#D97706', '#B45309', '#92400E'],
  danger: ['#EF4444', '#DC2626', '#B91C1C', '#991B1B'],
  purple: ['#8B5CF6', '#7C3AED', '#6D28D9', '#5B21B6'],
  pink: ['#EC4899', '#DB2777', '#BE185D', '#9D174D'],
  gray: ['#6B7280', '#4B5563', '#374151', '#1F2937'],
};

// Helper function to generate sample data
export const generateSampleData = (type: 'attendance' | 'fees' | 'performance' | 'progress') => {
  switch (type) {
    case 'attendance':
      return {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Present',
            data: [95, 92, 88, 94, 96, 91],
            backgroundColor: chartColors.success[0],
            borderColor: chartColors.success[1],
            borderWidth: 2,
            fill: false,
          },
          {
            label: 'Absent',
            data: [5, 8, 12, 6, 4, 9],
            backgroundColor: chartColors.danger[0],
            borderColor: chartColors.danger[1],
            borderWidth: 2,
            fill: false,
          },
        ],
      };
    case 'fees':
      return {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Collected',
            data: [85000, 92000, 88000, 95000, 98000, 93000],
            backgroundColor: chartColors.primary[0],
            borderColor: chartColors.primary[1],
            borderWidth: 2,
            fill: true,
            tension: 0.4,
          },
          {
            label: 'Pending',
            data: [15000, 8000, 12000, 5000, 2000, 7000],
            backgroundColor: chartColors.warning[0],
            borderColor: chartColors.warning[1],
            borderWidth: 2,
            fill: true,
            tension: 0.4,
          },
        ],
      };
    case 'performance':
      return {
        labels: ['Math', 'Science', 'English', 'History', 'Geography'],
        datasets: [
          {
            label: 'Average Score',
            data: [85, 78, 92, 88, 82],
            backgroundColor: chartColors.purple.map(color => color + '80'),
            borderColor: chartColors.purple,
            borderWidth: 2,
          },
        ],
      };
    case 'progress':
      return {
        labels: ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6'],
        datasets: [
          {
            label: 'Students',
            data: [25, 28, 30, 32, 35, 38],
            backgroundColor: chartColors.success[0],
            borderColor: chartColors.success[1],
            borderWidth: 2,
            fill: false,
            tension: 0.4,
          },
        ],
      };
    default:
      return {
        labels: [],
        datasets: [],
      };
  }
};

// Helper function to generate pie/doughnut data
export const generatePieData = (type: 'gender' | 'class' | 'department' | 'status') => {
  switch (type) {
    case 'gender':
      return {
        labels: ['Male', 'Female'],
        datasets: [
          {
            data: [55, 45],
            backgroundColor: [chartColors.primary[0], chartColors.pink[0]],
            borderColor: [chartColors.primary[1], chartColors.pink[1]],
            borderWidth: 2,
          },
        ],
      };
    case 'class':
      return {
        labels: ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5'],
        datasets: [
          {
            data: [25, 28, 30, 32, 35],
            backgroundColor: chartColors.primary,
            borderColor: chartColors.primary,
            borderWidth: 2,
          },
        ],
      };
    case 'department':
      return {
        labels: ['Teaching', 'Administration', 'Support', 'Management'],
        datasets: [
          {
            data: [45, 25, 20, 10],
            backgroundColor: chartColors.success,
            borderColor: chartColors.success,
            borderWidth: 2,
          },
        ],
      };
    case 'status':
      return {
        labels: ['Active', 'Inactive', 'Pending'],
        datasets: [
          {
            data: [70, 20, 10],
            backgroundColor: [chartColors.success[0], chartColors.danger[0], chartColors.warning[0]],
            borderColor: [chartColors.success[1], chartColors.danger[1], chartColors.warning[1]],
            borderWidth: 2,
          },
        ],
      };
    default:
      return {
        labels: [],
        datasets: [],
      };
  }
};
