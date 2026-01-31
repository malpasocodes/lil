import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { ActiveLearner } from "@/lib/db/dashboard-queries";

const columnHelper = createColumnHelper<ActiveLearner>();

const columns = [
  columnHelper.accessor("name", {
    header: "Name",
    cell: (info) => info.getValue() || "—",
  }),
  columnHelper.accessor("email", {
    header: "Email",
    cell: (info) => info.getValue() || "—",
  }),
  columnHelper.accessor("appName", {
    header: "App",
    cell: (info) => <Badge variant="secondary">{info.getValue()}</Badge>,
  }),
  columnHelper.accessor("lastLogin", {
    header: "Last Login",
    cell: (info) => {
      const d = new Date(info.getValue());
      return d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    },
  }),
];

export default function ActiveLearnersTable({
  data,
}: {
  data: ActiveLearner[];
}) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Learners Today</CardTitle>
        <CardDescription>
          {data.length} learner{data.length !== 1 ? "s" : ""} logged in today
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-8 text-center">
            No logins recorded today.
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="cursor-pointer select-none"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <span className="inline-flex items-center gap-1">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                        </span>
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {pageCount > 1 && (
              <div className="flex items-center justify-between pt-4">
                <span className="text-sm text-muted-foreground">
                  Page {pageIndex + 1} of {pageCount}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
