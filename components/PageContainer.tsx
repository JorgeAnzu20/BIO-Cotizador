export default function TableWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[800px]">
        {children}
      </div>
    </div>
  );
}
