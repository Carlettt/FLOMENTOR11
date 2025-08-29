import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, AlertCircle, XCircle, RefreshCw } from 'lucide-react';

interface DataHealthCheckProps {
  onClose: () => void;
}

interface HealthCheckResult {
  category: string;
  status: 'good' | 'warning' | 'error';
  message: string;
  count?: number;
}

export const DataHealthCheck: React.FC<DataHealthCheckProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { cycles, symptoms } = useApp();
  const [results, setResults] = useState<HealthCheckResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<string>('');

  useEffect(() => {
    performHealthCheck();
  }, []);

  const performHealthCheck = async () => {
    setLoading(true);
    const checkResults: HealthCheckResult[] = [];

    try {
      // Check profile completeness
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profile) {
        if (!profile.name || !profile.cycle_length || !profile.period_length) {
          checkResults.push({
            category: 'Profile',
            status: 'warning',
            message: 'Profile information is incomplete'
          });
        } else {
          checkResults.push({
            category: 'Profile',
            status: 'good',
            message: 'Profile is complete'
          });
        }
      } else {
        checkResults.push({
          category: 'Profile',
          status: 'error',
          message: 'Profile not found'
        });
      }

      // Check cycle data
      const userCycles = cycles.filter(c => c.userId === user?.id);
      if (userCycles.length === 0) {
        checkResults.push({
          category: 'Cycles',
          status: 'warning',
          message: 'No cycle data recorded',
          count: 0
        });
      } else if (userCycles.length < 3) {
        checkResults.push({
          category: 'Cycles',
          status: 'warning',
          message: 'Limited cycle data for accurate predictions',
          count: userCycles.length
        });
      } else {
        checkResults.push({
          category: 'Cycles',
          status: 'good',
          message: 'Sufficient cycle data for analysis',
          count: userCycles.length
        });
      }

      // Check symptom data
      const userSymptoms = symptoms.filter(s => s.userId === user?.id);
      if (userSymptoms.length === 0) {
        checkResults.push({
          category: 'Symptoms',
          status: 'warning',
          message: 'No symptom data recorded',
          count: 0
        });
      } else {
        checkResults.push({
          category: 'Symptoms',
          status: 'good',
          message: 'Symptom tracking is active',
          count: userSymptoms.length
        });
      }

      // Check data consistency
      const recentSymptoms = userSymptoms.filter(s => {
        const symptomDate = new Date(s.date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return symptomDate >= thirtyDaysAgo;
      });

      if (recentSymptoms.length === 0 && userSymptoms.length > 0) {
        checkResults.push({
          category: 'Data Freshness',
          status: 'warning',
          message: 'No recent symptom data (last 30 days)'
        });
      } else if (recentSymptoms.length > 0) {
        checkResults.push({
          category: 'Data Freshness',
          status: 'good',
          message: 'Recent data is available'
        });
      }

      // Check for data anomalies
      const cycleLengths = userCycles.map(c => c.length);
      const hasAnomalies = cycleLengths.some(length => length < 21 || length > 35);
      
      if (hasAnomalies) {
        checkResults.push({
          category: 'Data Quality',
          status: 'warning',
          message: 'Some cycle lengths are outside normal range'
        });
      } else if (cycleLengths.length > 0) {
        checkResults.push({
          category: 'Data Quality',
          status: 'good',
          message: 'Cycle data appears normal'
        });
      }

      setResults(checkResults);
      setLastChecked(new Date().toLocaleString());
    } catch (error) {
      console.error('Error performing health check:', error);
      checkResults.push({
        category: 'System',
        status: 'error',
        message: 'Error checking data health'
      });
      setResults(checkResults);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: 'good' | 'warning' | 'error') => {
    switch (status) {
      case 'good':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: 'good' | 'warning' | 'error') => {
    switch (status) {
      case 'good':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
    }
  };

  const overallHealth = results.length > 0 ? (
    results.every(r => r.status === 'good') ? 'excellent' :
    results.some(r => r.status === 'error') ? 'poor' :
    'good'
  ) : 'unknown';

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">🔍</span>
            Data Health Check
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
              <span className="ml-2 text-gray-600">Analyzing your data...</span>
            </div>
          ) : (
            <>
              {/* Overall Health Score */}
              <div className={`p-4 rounded-lg border-2 ${
                overallHealth === 'excellent' ? 'bg-green-50 border-green-200' :
                overallHealth === 'good' ? 'bg-yellow-50 border-yellow-200' :
                overallHealth === 'poor' ? 'bg-red-50 border-red-200' :
                'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Overall Health</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    overallHealth === 'excellent' ? 'bg-green-100 text-green-800' :
                    overallHealth === 'good' ? 'bg-yellow-100 text-yellow-800' :
                    overallHealth === 'poor' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {overallHealth === 'excellent' ? 'Excellent' :
                     overallHealth === 'good' ? 'Good' :
                     overallHealth === 'poor' ? 'Needs Attention' : 'Unknown'}
                  </span>
                </div>
              </div>

              {/* Individual Check Results */}
              <div className="space-y-3">
                {results.map((result, index) => (
                  <div key={index} className={`p-3 rounded-lg border ${getStatusColor(result.status)}`}>
                    <div className="flex items-start gap-3">
                      {getStatusIcon(result.status)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{result.category}</span>
                          {result.count !== undefined && (
                            <span className="text-xs text-gray-500">({result.count})</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Recommendations</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  {results.some(r => r.category === 'Cycles' && r.status !== 'good') && (
                    <li>• Log more cycle data for better predictions</li>
                  )}
                  {results.some(r => r.category === 'Symptoms' && r.status !== 'good') && (
                    <li>• Start tracking daily symptoms for insights</li>
                  )}
                  {results.some(r => r.category === 'Profile' && r.status !== 'good') && (
                    <li>• Complete your profile information</li>
                  )}
                  {results.some(r => r.category === 'Data Freshness' && r.status !== 'good') && (
                    <li>• Update your recent health information</li>
                  )}
                </ul>
              </div>

              {lastChecked && (
                <p className="text-xs text-gray-500 text-center">
                  Last checked: {lastChecked}
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            onClick={performHealthCheck}
            variant="outline"
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Recheck
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};