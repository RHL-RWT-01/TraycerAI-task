import { useEffect, useState } from 'react';
import { api, handleApiError } from '../services/api';

export default function ListPlans() {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
    });
    const [sortBy, setSortBy] = useState<'createdAt'>('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const loadPlans = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await api.listPlans({
                page: pagination.page,
                limit: pagination.limit,
                sortBy,
                sortOrder,
            });

            if (response.success && response.data) {
                setPlans(response.data);
                setPagination(response.pagination);
            } else {
                setError(response.error || 'Failed to load plans');
            }
        } catch (err) {
            setError(handleApiError(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPlans();
    }, [pagination.page, pagination.limit, sortBy, sortOrder]);

    const handlePageChange = (newPage: number) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    const handleLimitChange = (newLimit: number) => {
        setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
    };

    return (
        <div className="page">
            <div className="page-header">
                <h1>List Plans</h1>
                <button onClick={loadPlans} className="btn btn-secondary" disabled={loading}>
                    🔄 Refresh
                </button>
            </div>

            <div className="card">
                <div className="card-header">
                    <div className="flex gap-4">
                        <div className="form-group">
                            <label htmlFor="sortBy">Sort By:</label>
                            <select
                                id="sortBy"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as 'createdAt')}
                                className="form-control"
                            >
                                <option value="createdAt">Created Date</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="sortOrder">Order:</label>
                            <select
                                id="sortOrder"
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                                className="form-control"
                            >
                                <option value="desc">Descending</option>
                                <option value="asc">Ascending</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="limit">Per Page:</label>
                            <select
                                id="limit"
                                value={pagination.limit}
                                onChange={(e) => handleLimitChange(parseInt(e.target.value))}
                                className="form-control"
                            >
                                <option value="5">5</option>
                                <option value="10">10</option>
                                <option value="20">20</option>
                                <option value="50">50</option>
                            </select>
                        </div>
                    </div>
                </div>

                {loading && (
                    <div className="loading-state">
                        <div className="loader"></div>
                        <p>Loading plans...</p>
                    </div>
                )}

                {error && (
                    <div className="error-message">
                        <span>❌ {error}</span>
                    </div>
                )}

                {!loading && !error && plans.length === 0 && (
                    <div className="empty-state">
                        <p>📄 No plans found. Create your first plan!</p>
                    </div>
                )}

                {!loading && plans.length > 0 && (
                    <>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Task Description</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {plans.map((plan) => (
                                        <tr key={plan.id}>
                                            <td className="font-mono text-xs">{plan.id.slice(0, 8)}...</td>
                                            <td className="max-w-xs truncate">{plan.taskDescription}</td>
                                            <td>
                                                <span className={`status-badge ${plan.status === 'completed' ? 'status-healthy' : 'status-error'}`}>
                                                    {plan.status}
                                                </span>
                                            </td>
                                            <td>{new Date(plan.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                <button
                                                    onClick={() => window.open(`/view-plan?id=${plan.id}`, '_blank')}
                                                    className="btn btn-sm btn-secondary"
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {pagination.totalPages > 1 && (
                            <div className="pagination">
                                <button
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                    className="btn btn-secondary"
                                >
                                    ← Previous
                                </button>

                                <span className="pagination-info">
                                    Page {pagination.page} of {pagination.totalPages}
                                    ({pagination.total} total plans)
                                </span>

                                <button
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page === pagination.totalPages}
                                    className="btn btn-secondary"
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}