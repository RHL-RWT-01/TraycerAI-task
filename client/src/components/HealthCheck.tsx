import { Activity, CheckCircle, RefreshCw, XCircle } from './Icons';
import { useEffect, useState } from 'react';
import { api, handleApiError } from '../services/api';

export default function HealthCheck() {
    const [status, setStatus] = useState<'loading' | 'healthy' | 'error'>('loading');
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string>('');
    const [lastChecked, setLastChecked] = useState<Date | null>(null);

    const checkHealth = async () => {
        setStatus('loading');
        setError('');

        try {
            const response = await api.healthCheck();
            setData(response.data);
            setStatus('healthy');
            setLastChecked(new Date());
        } catch (err) {
            setError(handleApiError(err));
            setStatus('error');
            setLastChecked(new Date());
        }
    };

    useEffect(() => {
        checkHealth();
    }, []);

    const getStatusIcon = () => {
        switch (status) {
            case 'loading':
                return <RefreshCw className="animate-spin" size={24} />;
            case 'healthy':
                return <CheckCircle className="text-green-500" size={24} />;
            case 'error':
                return <XCircle className="text-red-500" size={24} />;
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'healthy':
                return 'status-healthy';
            case 'error':
                return 'status-error';
            default:
                return 'status-loading';
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <Activity size={24} />
                <h1>Health Check</h1>
            </div>

            <div className="card">
                <div className="card-header">
                    <div className="flex items-center gap-2">
                        {getStatusIcon()}
                        <span className={`status-badge ${getStatusColor()}`}>
                            {status === 'loading' ? 'Checking...' : status === 'healthy' ? 'Healthy' : 'Error'}
                        </span>
                    </div>
                    <button onClick={checkHealth} className="btn btn-secondary" disabled={status === 'loading'}>
                        <RefreshCw size={16} />
                        Check Again
                    </button>
                </div>

                {lastChecked && (
                    <p className="text-sm text-gray-500 mb-4">
                        Last checked: {lastChecked.toLocaleString()}
                    </p>
                )}

                {error && (
                    <div className="error-message">
                        <XCircle size={16} />
                        <span>Error: {error}</span>
                    </div>
                )}

                {data && (
                    <div className="json-display">
                        <h3>Response Data:</h3>
                        <pre>{JSON.stringify(data, null, 2)}</pre>
                    </div>
                )}
            </div>
        </div>
    );
}