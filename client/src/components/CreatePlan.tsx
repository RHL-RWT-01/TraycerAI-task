import { AlertCircle, CheckCircle, FileText, Loader, Send } from './Icons';
import { useState } from 'react';
import { api, handleApiError } from '../services/api';
import type { CreatePlanRequest, PlanResponse } from '../services/api';

export default function CreatePlan() {
    const [formData, setFormData] = useState<CreatePlanRequest>({
        taskDescription: '',
    });

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<PlanResponse | null>(null);
    const [error, setError] = useState<string>('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResult(null);

        try {
            const response = await api.createPlan(formData);
            if (response.success && response.data) {
                setResult(response.data);
            } else {
                setError(response.error || 'Failed to create plan');
            }
        } catch (err) {
            setError(handleApiError(err));
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="page">
            <div className="page-header">
                <FileText size={24} />
                <h1>Create Plan</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                    <h2>Plan Generation Request</h2>

                    <form onSubmit={handleSubmit} className="form">
                        <div className="form-group">
                            <label htmlFor="taskDescription">Task Description *</label>
                            <textarea
                                id="taskDescription"
                                name="taskDescription"
                                value={formData.taskDescription}
                                onChange={handleInputChange}
                                placeholder="Desscribe your task..."
                                rows={4}
                                required
                                className="form-control"
                            />
                            <small>Minimum 10 characters, maximum 2000 characters</small>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !formData.taskDescription}
                            className="btn btn-primary"
                        >
                            {loading ? (
                                <>
                                    <Loader className="animate-spin" size={16} />
                                    Generating Plan...
                                </>
                            ) : (
                                <>
                                    <Send size={16} />
                                    Generate Plan
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="card">
                    <h2>Result</h2>

                    {loading && (
                        <div className="loading-state">
                            <Loader className="animate-spin" size={24} />
                            <p>Generating plan...</p>
                            <small>This may take a few moments</small>
                        </div>
                    )}

                    {error && (
                        <div className="error-message">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    {result && (
                        <div className="success-state">
                            <div className="flex items-center gap-2 mb-4">
                                <CheckCircle className="text-green-500" size={20} />
                                <span className="font-medium">Plan Generated Successfully!</span>
                            </div>

                            <div className="result-metadata">
                                <div className="metadata-item">
                                    <strong>Plan ID:</strong> {result.id}
                                </div>
                                <div className="metadata-item">
                                    <strong>Created:</strong> {new Date(result.createdAt).toLocaleString()}
                                </div>
                                <div className="metadata-item">
                                    <strong>Planning Time:</strong> {result.planningTime}ms
                                </div>
                            </div>

                            <div className="plan-content">
                                <h3>Generated Plan:</h3>
                                <div className="markdown-content">
                                    <pre className="whitespace-pre-wrap">{result.plan}</pre>
                                </div>
                            </div>
                        </div>
                    )}

                    {!loading && !error && !result && (
                        <div className="empty-state">
                            <FileText size={48} className="text-gray-400" />
                            <p>Fill out the form and click "Generate Plan" to see results here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}