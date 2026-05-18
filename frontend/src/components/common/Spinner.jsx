export default function Spinner({ size = 'md' }) {
  const sz = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-12 h-12' : 'w-8 h-8';
  return (
    <div className="flex justify-center items-center">
      <div className={`${sz} border-4 border-green-200 border-t-green-600 rounded-full animate-spin`} />
    </div>
  );
}
