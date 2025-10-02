import { useState, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Play,
  Pause,
  Save,
  Download,
  Trash2,
  Activity,
  Clock,
  Database,
} from "lucide-react";

interface DataPoint {
  timestamp: number;
  x: number;
  y: number;
  z: number;
  activity: string;
  magnitude: number;
}

interface ChartDataPoint {
  time: number;
  x: number;
  y: number;
  z: number;
}

interface Stats {
  samples: number;
  duration: number;
  samplingRate: number;
}

// For the serial port types, you'll need to extend the Navigator interface
declare global {
  interface Navigator {
    serial: {
      requestPort(): Promise<SerialPort>;
    };
  }
}

interface SerialPort {
  readable: ReadableStream;
  writable: WritableStream;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
}

interface ActivityCounts {
  [key: string]: number;
}

const STM32DataCollector = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [dataBuffer, setDataBuffer] = useState<DataPoint[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [stats, setStats] = useState<Stats>({
    samples: 0,
    duration: 0,
    samplingRate: 0,
  });
  const [port, setPort] = useState<SerialPort | null>(null);
  const [reader, setReader] = useState<ReadableStreamDefaultReader | null>(
    null
  );
  const collectionStartTime = useRef<number | null>(null);
  const sampleCount = useRef(0);
  const lastSampleTime = useRef<number | null>(null);

  const isCollectingRef = useRef(false);
  const currentActivityRef = useRef("IDLE");

  const activities: string[] = [
    "Walking",
    "Running",
    "Jumping",
    "Sitting",
    "Standing",
    "Lying Down",
    "Climbing Stairs",
    "Descending Stairs",
    "Squatting",
  ];

  const connectSerial = async () => {
    try {
      const selectedPort = await navigator.serial.requestPort();
      await selectedPort.open({ baudRate: 115200 });
      setPort(selectedPort);
      setIsConnected(true);
      startReading(selectedPort);
    } catch (error: any) {
      alert("Failed to connect: " + error.message);
    }
  };

  const processLine = (line: string) => {
    if (!isCollectingRef.current) return;

    // Parse format: "  123,  456,  789"
    const matches = RegExp(/(-?\d+),\s*(-?\d+),\s*(-?\d+)/).exec(line);
    if (matches) {
      const timestamp = Date.now();
      const x = parseInt(matches[1]);
      const y = parseInt(matches[2]);
      const z = parseInt(matches[3]);

      const dataPoint: DataPoint = {
        timestamp,
        x,
        y,
        z,
        activity: currentActivityRef.current,
        magnitude: Math.sqrt(x * x + y * y + z * z),
      };

      setDataBuffer((prev) => [...prev, dataPoint]);

      sampleCount.current += 1;
      if (sampleCount.current % 5 === 0) {
        setChartData((prev) => {
          const newData = [...prev, { time: sampleCount.current, x, y, z }];
          return newData.slice(-100);
        });
      }

      // Update statistics
      const currentTime = Date.now();
      if (lastSampleTime.current && collectionStartTime.current) {
        const rate = 1000 / (currentTime - lastSampleTime.current);
        setStats({
          samples: sampleCount.current,
          duration: Math.floor(
            (currentTime - collectionStartTime.current) / 1000
          ),
          samplingRate: Math.round(rate * 10) / 10,
        });
      } else if (collectionStartTime.current) {
        setStats((prev) => ({
          ...prev,
          samples: sampleCount.current,
          duration: Math.floor(
            (currentTime - collectionStartTime.current!) / 1000
          ),
        }));
      }
      lastSampleTime.current = currentTime;
    }
  };

  const disconnectSerial = async () => {
    try {
      if (reader) {
        await reader.cancel();
        reader.releaseLock();
        setReader(null);
      }
      if (port) {
        await port.close();
        setPort(null);
      }
    } catch (error) {
      console.error("Error during disconnect:", error);
    } finally {
      setIsConnected(false);
      isCollectingRef.current = false;
    }
  };

  const startReading = async (serialPort: SerialPort) => {
    try {
      const textDecoder = new TextDecoderStream();
      serialPort.readable.pipeTo(textDecoder.writable);
      const inputReader = textDecoder.readable.getReader();
      setReader(inputReader);

      let buffer = "";
      try {
        while (true) {
          const { value, done } = await inputReader.read();
          if (done) break;

          buffer += value;
          // Split on both \r\n and \n
          const lines = buffer.split(/\r\n|\n/);
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim()) {
              processLine(line.trim());
            }
          }
        }
      } catch (error) {
        console.error("Reading error:", error);
      } finally {
        inputReader.releaseLock();
      }
    } catch (error) {
      console.error("Stream setup error:", error);
    }
  };

  const startCollection = () => {
    if (!isConnected) {
      alert("Please connect to the device first");
      return;
    }
    isCollectingRef.current = true;
    collectionStartTime.current = Date.now();
    sampleCount.current = 0;
    lastSampleTime.current = null;
    setStats({ samples: 0, duration: 0, samplingRate: 0 });
  };

  const pauseCollection = () => {
    isCollectingRef.current = false;
  };

  const clearData = () => {
    if (window.confirm("Are you sure you want to clear all collected data?")) {
      setDataBuffer([]);
      setChartData([]);
      sampleCount.current = 0;
      collectionStartTime.current = null; // Add this line
      lastSampleTime.current = null; // Add this line
      setStats({ samples: 0, duration: 0, samplingRate: 0 });
    }
  };

  const saveDataset = () => {
    if (dataBuffer.length === 0) {
      alert("No data to save");
      return;
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    const filename = `stm32_accel_data_${timestamp}.csv`;

    let csv = "timestamp,x,y,z,magnitude,activity\n";
    dataBuffer.forEach((point) => {
      csv += `${point.timestamp},${point.x},${point.y},${
        point.z
      },${point.magnitude.toFixed(2)},${point.activity}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportStatistics = () => {
    const activityCounts: ActivityCounts = {};
    dataBuffer.forEach((point) => {
      activityCounts[point.activity] =
        (activityCounts[point.activity] || 0) + 1;
    });

    let report = "STM32 Accelerometer Data Collection Report\n";
    report += "===========================================\n\n";
    report += `Total Samples: ${stats.samples}\n`;
    report += `Duration: ${stats.duration}s\n`;
    report += `Sampling Rate: ${stats.samplingRate} Hz\n\n`;
    report += "Activity Distribution:\n";
    Object.entries(activityCounts).forEach(([activity, count]) => {
      const percentage = ((count / stats.samples) * 100).toFixed(1);
      report += `  ${activity}: ${count} samples (${percentage}%)\n`;
    });

    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `statistics_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 mb-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-3xl font-bold text-white">
                  STM32U5 Data Collector
                </h1>
                <p className="text-blue-200">
                  ISM330DHCX Accelerometer Dataset Builder
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              {!isConnected ? (
                <button
                  onClick={connectSerial}
                  className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-all transform hover:scale-105"
                >
                  Connect Device
                </button>
              ) : (
                <button
                  onClick={disconnectSerial}
                  className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Control Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Collection Controls */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">
                Collection Controls
              </h2>
              <div className="space-y-3">
                <button
                  onClick={startCollection}
                  disabled={!isConnected || isCollectingRef.current}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white rounded-lg font-medium transition-all"
                >
                  <Play className="w-5 h-5" />
                  Start Collecting
                </button>
                <button
                  onClick={pauseCollection}
                  disabled={!isCollectingRef.current}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-500 text-white rounded-lg font-medium transition-all"
                >
                  <Pause className="w-5 h-5" />
                  Pause Collecting
                </button>
                <button
                  onClick={saveDataset}
                  disabled={dataBuffer.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white rounded-lg font-medium transition-all"
                >
                  <Save className="w-5 h-5" />
                  Save Dataset
                </button>
                <button
                  onClick={exportStatistics}
                  disabled={dataBuffer.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-500 text-white rounded-lg font-medium transition-all"
                >
                  <Download className="w-5 h-5" />
                  Export Stats
                </button>
                <button
                  onClick={clearData}
                  disabled={dataBuffer.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-500 text-white rounded-lg font-medium transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                  Clear Data
                </button>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">Statistics</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-white">
                  <span className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-400" />
                    Samples
                  </span>
                  <span className="font-bold">{stats.samples}</span>
                </div>
                <div className="flex items-center justify-between text-white">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-400" />
                    Duration
                  </span>
                  <span className="font-bold">{stats.duration}s</span>
                </div>
                <div className="flex items-center justify-between text-white">
                  <span className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    Rate
                  </span>
                  <span className="font-bold">{stats.samplingRate} Hz</span>
                </div>
              </div>
            </div>

            {/* Current Activity Display */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-2">
                Current Activity
              </h2>
              <div
                className={`text-center py-4 px-6 rounded-lg font-bold text-2xl ${
                  currentActivityRef.current === "IDLE"
                    ? "bg-gray-500"
                    : "bg-gradient-to-r from-blue-500 to-purple-500"
                }`}
              >
                <span className="text-white">{currentActivityRef.current}</span>
              </div>
              {isCollectingRef.current && (
                <div className="mt-3 flex items-center justify-center gap-2 text-green-400">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Recording...</span>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Activity Selection */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">
                Select Activity
              </h2>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => (currentActivityRef.current = "IDLE")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    currentActivityRef.current === "IDLE"
                      ? "bg-gray-600 text-white ring-2 ring-white"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  IDLE
                </button>
                {activities.map((activity) => (
                  <button
                    key={activity}
                    onClick={() => (currentActivityRef.current = activity)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      currentActivityRef.current === activity
                        ? "bg-blue-600 text-white ring-2 ring-white"
                        : "bg-white/20 text-white hover:bg-white/30"
                    }`}
                  >
                    {activity}
                  </button>
                ))}
              </div>
            </div>

            {/* Real-time Chart */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">
                Real-time Accelerometer Data
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff30" />
                  <XAxis
                    dataKey="time"
                    stroke="#fff"
                    tick={{ fill: "#fff" }}
                    domain={["dataMin", "dataMax"]}
                  />
                  <YAxis
                    stroke="#fff"
                    tick={{ fill: "#fff" }}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                      color: "#fff",
                    }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="x"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="y"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="z"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Activity Distribution */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">
                Activity Distribution
              </h2>
              <div className="space-y-2">
                {["IDLE", ...activities].map((activity) => {
                  const count = dataBuffer.filter(
                    (d) => d.activity === activity
                  ).length;
                  const percentage =
                    stats.samples > 0 ? (count / stats.samples) * 100 : 0;
                  return (
                    <div key={activity} className="flex items-center gap-3">
                      <span className="text-white w-32 text-sm">
                        {activity}
                      </span>
                      <div className="flex-1 bg-white/20 rounded-full h-6 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-white w-20 text-right text-sm font-medium">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default STM32DataCollector;
