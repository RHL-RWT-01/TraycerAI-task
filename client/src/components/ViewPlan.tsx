import { useState } from 'react';
import { api, handleApiError } from '../services/api';

export default function ViewPlan() {
    const [planId, setPlanId] = useState<string>('');
    const [plan, setPlan] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');

    // Check URL params for plan ID
    useState(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        if (id) {
            setPlanId(id);
            handleSearch(id);
        }
    });

    const handleSearch = async (id?: string) => {
        const searchId = id || planId;
        if (!searchId) return;

        setLoading(true);
        setError('');
        setPlan(null);

        try {
            const response = await api.getPlan(searchId);
            if (response.success && response.data) {
                setPlan(response.data);
            } else {
                setError(response.error || 'Plan not found');
            }
        } catch (err) {
            setError(handleApiError(err));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSearch();
    };

    return (
        <div className="page">
            <div className="page-header">
                <h1>View Plan</h1>
            </div>

            <div className="card">
                <h2>Search by Plan ID</h2>

                <form onSubmit={handleSubmit} className="form">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={planId}
                            onChange={(e) => setPlanId(e.target.value)}
                            placeholder="Enter plan UUID..."
                            className="form-control flex-1"
                        />
                        <button
                            type="submit"
                            disabled={loading || !planId}
                            className="btn btn-primary"
                        >
                            {loading ? '🔍 Searching...' : '🔍 Search'}
                        </button>
                    </div>
                </form>

                {loading && (
                    <div className="loading-state">
                        <div className="loader"></div>
                        <p>Loading plan...</p>
                    </div>
                )}

                {error && (
                    <div className="error-message">
                        <span>❌ {error}</span>
                    </div>
                )}

                {plan && (
                    <div className="plan-details">
                        <div className="plan-header">
                            <h3>Plan Details</h3>
                            <span className={`status-badge ${plan.status === 'completed' ? 'status-healthy' : 'status-error'}`}>
                                {plan.status}
                            </span>
                        </div>

                        <div className="plan-metadata">
                            <div className="metadata-grid">
                                <div className="metadata-item">
                                    <strong>Plan ID:</strong>
                                    <span className="font-mono">{plan.id}</span>
                                </div>
                                <div className="metadata-item">
                                    <strong>Created:</strong>
                                    <span>{new Date(plan.createdAt).toLocaleString()}</span>
                                </div>
                                <div className="metadata-item">
                                    <strong>Planning Time:</strong>
                                    <span>{plan.planningTime}ms</span>
                                </div>
                            </div>
                        </div>

                        <div className="task-description">
                            <h4>Task Description:</h4>
                            <p>{plan.taskDescription}</p>
                        </div>

                        <div className="plan-content">
                            <h4>Generated Plan:</h4>
                            <div className="markdown-content">
                                <pre className="whitespace-pre-wrap">{plan.plan}</pre>
                            </div>
                        </div>
                    </div>
                )}

                {!loading && !error && !plan && (
                    <div className="empty-state">
                        <p>🔍 Enter a plan ID above to view plan details.</p>
                    </div>
                )}
            </div>
        </div>
    );
}