import { FountainLoader } from "@/components/motion/fountain-loader";

export default function Loading() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <FountainLoader size={30} label="正在加载数据复盘" />
    </div>
  );
}
