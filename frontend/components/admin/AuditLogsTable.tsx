import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Pagination } from "../ui/Pagination"; // Assuming Pagination component exists as seen in AdminDashboard imports
import { Loader, Search, RefreshCw } from "lucide-react";
import { useDebounce } from "../../hooks/useDebounce"; // Assuming useDebounce exists

interface AuditLog {
  _id: string;
  userId?: {
    name: string;
    rollNo: string;
    dept: string;
  };
  adminId?: string;
  userType: "USER" | "ADMIN";
  action: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

export const AuditLogsTable: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 500);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs(page, pageSize, debouncedSearch);
      setLogs(data.logs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error("Failed to fetch audit logs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, pageSize, debouncedSearch]);

  return (
    <div className="space-y-6">
      <div className="flex max-sm:flex-col max-sm:gap-y-4 justify-between items-center bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg">
        <div>
          <h3 className="text-2xl font-bold text-white">Audit Logs</h3>
          <p className="text-sm text-slate-400">
            System access logs for security auditing.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search logs..."
              className="bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none w-64 max-sm:w-48"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <button
            onClick={fetchLogs}
            className="p-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader className="animate-spin text-indigo-500 h-10 w-10" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/50 text-indigo-300 uppercase text-xs tracking-wider">
                  <th className="p-4 font-semibold">Time</th>
                  <th className="p-4 font-semibold">User Type</th>
                  <th className="p-4 font-semibold">Identity</th>
                  <th className="p-4 font-semibold">Action</th>
                  <th className="p-4 font-semibold">IP Address</th>
                  <th className="p-4 font-semibold">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700 text-sm text-slate-300">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <tr
                      key={log._id}
                      className="hover:bg-slate-700/30 transition-colors even:bg-slate-800/50"
                    >
                      <td className="p-4 whitespace-nowrap text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            log.userType === "ADMIN"
                              ? "bg-purple-900 text-purple-200 border border-purple-700"
                              : "bg-blue-900 text-blue-200 border border-blue-700"
                          }`}
                        >
                          {log.userType}
                        </span>
                      </td>
                      <td className="p-4">
                        {log.userType === "ADMIN" ? (
                          <span className="font-mono text-purple-300">
                            @{log.adminId}
                          </span>
                        ) : (
                          <div className="flex flex-col">
                            <span className="font-semibold text-white">
                              {log.userId?.name || "Unknown"}
                            </span>
                            <span className="text-xs text-slate-500">
                              {log.userId?.rollNo}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            log.action === "LOGIN"
                              ? "bg-emerald-900/50 text-emerald-400 border border-emerald-800"
                              : "bg-orange-900/50 text-orange-400 border border-orange-800"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-xs">{log.ipAddress}</td>
                      <td
                        className="p-4 font-mono text-xs truncate max-w-[200px]"
                        title={log.userAgent}
                      >
                        {log.userAgent}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 border-t border-slate-700 bg-slate-800">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </div>
      </div>
    </div>
  );
};
