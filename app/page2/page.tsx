import SearchComparisonClient from "../../components/SearchComparisonClient";
import { AiFillExclamationCircle } from "react-icons/ai";
type PageTwoProps = {
  searchParams?: Promise<{
    start?: string | string[];
    goal?: string | string[];
  }>;
};

export default async function PageTwo({ searchParams }: PageTwoProps) {
  const params = (await searchParams) ?? {};

  const start = Array.isArray(params.start)
    ? params.start[0]
    : params.start;

  const goal = Array.isArray(params.goal)
    ? params.goal[0]
    : params.goal;

  return (
    <SearchComparisonClient
      start={start}
      goal={goal}
    />
  );
}
