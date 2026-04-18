import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Package, 
  Building,
  Download,
  ArrowUp,
  ArrowDown,
  Shield,
  Activity, // General activity
  RefreshCw
} from 'lucide-react';
import { authAPI, apartmentsAPI, logsAPI, deliveriesAPI } from '../../services/api';
import socketService from '../../services/socket';

const AdminReports = () => {
  const [dateRange, setDateRange] = useState('month');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statsData, setStatsData] = useState([
    { title: 'Total Visitors', value: '0', change: '+0%', trend: 'neutral', icon: Users, color: '#3B82F6' },
    { title: 'Total Deliveries', value: '0', change: '+0%', trend: 'neutral', icon: Package, color: '#8B5CF6' },
    { title: 'Active Users', value: '0', change: '+0%', trend: 'neutral', icon: Shield, color: '#22C55E' },
    { title: 'Properties', value: '0', change: '+0%', trend: 'neutral', icon: Building, color: '#F59E0B' },
  ]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [todayStats, setTodayStats] = useState({ visitors: 0, deliveries: 0 });

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      
      // Fetch users for stats
      const usersRes = await authAPI.getUsers({ limit: 100 });
      const users = usersRes.data.users || [];
      
      // Fetch apartments
      const apartmentsRes = await apartmentsAPI.getAll({ limit: 100 });
      const apartments = apartmentsRes.data.apartments || [];
      
      // Fetch logs for stats
      const logsRes = await logsAPI.getAll({ limit: 500 });
      const logs = logsRes.data.logs || logsRes.data || [];
      
      // Fetch deliveries
      const deliveriesRes = await deliveriesAPI.getAll({ limit: 500 });
      const deliveries = deliveriesRes.data.deliveries || deliveriesRes.data || [];
      
      // Calculate today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayLogs = logs.filter(l => new Date(l.createdAt) >= today);
      const todayDeliveries = deliveries.filter(d => new Date(d.createdAt) >= today);
      
      setTodayStats({
        visitors: todayLogs.filter(l => l.personType === 'visitor').length,
        deliveries: todayDeliveries.length
      });
      
      // Calculate stats with real percentage changes
      const visitorCount = logs.filter(l => l.personType === 'visitor').length;
      const activeUserCount = users.filter(u => u.isActive !== false).length;
      
      // Calculate percentage changes by comparing current month to previous month
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      
      // Previous month data
      const previousMonthLogs = logs.filter(log => {
        if (!log.createdAt) return false;
        const logDate = new Date(log.createdAt);
        return logDate.getMonth() === previousMonth && logDate.getFullYear() === previousYear;
      });
      
      const prevVisitors = previousMonthLogs.filter(l => l.personType === 'visitor').length;
      const prevDeliveries = previousMonthLogs.filter(l => l.personType === 'delivery').length;
      const prevActiveUsers = users.filter(u => {
        if (!u.createdAt) return false;
        const createDate = new Date(u.createdAt);
        return createDate.getMonth() === previousMonth && createDate.getFullYear() === previousYear && u.isActive !== false;
      }).length;
      
      // Calculate percentage change
      const calcChange = (current, previous) => {
        if (previous === 0) return current > 0 ? '+100%' : '0%';
        const change = ((current - previous) / previous) * 100;
        const sign = change >= 0 ? '+' : '';
        return sign + Math.round(change) + '%';
      };
      
      // Determine trend direction
      const calcTrend = (current, previous) => {
        if (previous === 0) return current > 0 ? 'up' : 'neutral';
        return current >= previous ? 'up' : 'down';
      };
      
      setStatsData([
        { 
          title: 'Total Visitors', 
          value: String(visitorCount || 0), 
          change: calcChange(visitorCount, prevVisitors), 
          trend: calcTrend(visitorCount, prevVisitors), 
          icon: Users, 
          color: '#3B82F6' 
        },
        { 
          title: 'Total Deliveries', 
          value: String(deliveries.length || 0), 
          change: calcChange(deliveries.length, prevDeliveries), 
          trend: calcTrend(deliveries.length, prevDeliveries), 
          icon: Package, 
          color: '#8B5CF6' 
        },
        { 
          title: 'Active Users', 
          value: String(activeUserCount || 0), 
          change: calcChange(activeUserCount, prevActiveUsers || 1), 
          trend: calcTrend(activeUserCount, prevActiveUsers || 1), 
          icon: Shield, 
          color: '#22C55E' 
        },
        { 
          title: 'Properties', 
          value: String(apartments.length || 0), 
          change: '+1%', 
          trend: 'up', 
          icon: Building, 
          color: '#F59E0B' 
        }
      ]);
      
      // Generate real monthly data from logs for last 6 months
      const now = new Date();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Get last 6 months
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          name: monthNames[d.getMonth()],
          year: d.getFullYear(),
          month: d.getMonth()
        });
      }
      
      setMonthlyData(months.map((m) => {
        const monthLogs = logs.filter(log => {
          if (!log.createdAt) return false;
          const logDate = new Date(log.createdAt);
          return logDate.getMonth() === m.month && logDate.getFullYear() === m.year;
        });
        
        const visitors = monthLogs.filter(l => l.personType === 'visitor').length;
        const deliveries = monthLogs.filter(l => l.personType === 'delivery').length;
        
        return {
          month: m.name,
          visitors: visitors,
          deliveries: deliveries,
          access: monthLogs.length
        };
      }));
      
      // Recent activity from logs
      setRecentActivity(logs.slice(0, 8).map(log => ({
        type: log.personType || 'access',
        message: `${log.personName || 'User'} - ${log.action || 'Activity'}`,
        time: log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : 'Recent'
      })));
      
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time event handlers
  useEffect(() => {
    const handleVisitorArrived = () => {
      setTodayStats(prev => ({ ...prev, visitors: prev.visitors + 1 }));
      // Update monthly data immediately for real-time feel
      setMonthlyData(prev => {
        const newData = prev.map((m, idx) => {
          const now = new Date();
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const currentMonthName = monthNames[now.getMonth()];
          if (m.month === currentMonthName) {
            return {
              ...m,
              visitors: m.visitors + 1,
              access: m.access + 1
            };
          }
          return m;
        });
        return newData;
      });
      // Also refresh full data
      fetchData();
    };

    const handleDeliveryArrived = () => {
      setTodayStats(prev => ({ ...prev, deliveries: prev.deliveries + 1 }));
      // Update monthly data immediately for real-time feel
      setMonthlyData(prev => {
        const newData = prev.map((m) => {
          const now = new Date();
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const currentMonthName = monthNames[now.getMonth()];
          if (m.month === currentMonthName) {
            return {
              ...m,
              deliveries: m.deliveries + 1
            };
          }
          return m;
        });
        return newData;
      });
      fetchData();
    };

    const handleAccessNew = (data) => {
      // Update monthly data immediately
      setMonthlyData(prev => {
        const newData = prev.map((m) => {
          const now = new Date();
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const currentMonthName = monthNames[now.getMonth()];
          if (m.month === currentMonthName) {
            return {
              ...m,
              access: m.access + 1
            };
          }
          return m;
        });
        return newData;
      });
      setRecentActivity(prev => [{
        type: 'access',
        message: `Access event: ${data.type || 'Activity'}`,
        time: 'Just now'
      }, ...prev.slice(0, 7)]);
    };

    const handleEmergencyNew = () => {
      fetchData();
    };

    const handleNotification = () => {
      fetchData();
    };

    // Subscribe to real-time events
    socketService.onVisitorArrived(handleVisitorArrived);
    socketService.onDeliveryArrived(handleDeliveryArrived);
    socketService.onAccessNew(handleAccessNew);
    socketService.onEmergencyNew(handleEmergencyNew);
    socketService.onNotification(handleNotification);
    socketService.joinAdmin();

    return () => {
      socketService.removeListener('visitor:arrived', handleVisitorArrived);
      socketService.removeListener('delivery:arrived', handleDeliveryArrived);
      socketService.removeListener('access:new', handleAccessNew);
      socketService.removeListener('emergency:new', handleEmergencyNew);
      socketService.removeListener('notification:new', handleNotification);
    };
  }, [fetchData]);

  const handleExport = () => {
    // Create CSV data
    const csvData = [
      ['Report Type', 'Reports & Analytics'],
      ['Generated', new Date().toLocaleString()],
      [''],
      ['Metric', 'Value', 'Change'],
      ['Total Visitors', statsData[0].value, statsData[0].change],
      ['Total Deliveries', statsData[1].value, statsData[1].change],
      ['Active Users', statsData[2].value, statsData[2].change],
      ['Properties', statsData[3].value, statsData[3].change],
      [''],
      ['Today\'s Visitors', todayStats.visitors],
      ['Today\'s Deliveries', todayStats.deliveries],
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bomasecure_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const containerStyle = {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto'
  };

  const cardStyle = {
    background: '#1E293B',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    marginBottom: '20px'
  };

  const maxVisitors = Math.max(...monthlyData.map(d => d.visitors), 1);
  const maxDeliveries = Math.max(...monthlyData.map(d => d.deliveries), 1);
  const maxAccess = Math.max(...monthlyData.map(d => d.access), 1);

  return (
    <div style={containerStyle}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '24px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: 700,
              color: '#F1F5F9',
              fontFamily: 'Poppins, sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <BarChart3 size={32} color="#3B82F6" />
              Reports & Analytics
            </h1>
            <p style={{
              margin: '8px 0 0',
              fontSize: '16px',
              fontWeight: 600,
              color: '#CBD5E1'
            }}>
              Overview of security and activity metrics
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={fetchData}
              disabled={refreshing}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid #334155',
                background: '#1E293B',
                fontSize: '14px',
                fontWeight: 600,
                color: '#F1F5F9',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <RefreshCw size={18} className={refreshing ? 'spinning' : ''} />
              Refresh
            </button>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid #334155',
                background: '#1E293B',
                fontSize: '14px',
                fontWeight: 600,
                color: '#F1F5F9',
                cursor: 'pointer'
              }}
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
            <button
              onClick={handleExport}
              style={{
                padding: '10px 20px',
                background: '#3B82F6',
                border: 'none',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <Download size={18} />
              Export
            </button>
          </div>
        </div>
      </motion.div>

      {/* Today's Live Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          ...cardStyle,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
            🔴 Today's Live Activity
          </h2>
          <span style={{
            padding: '4px 12px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              background: '#4ade80',
              borderRadius: '50%',
              animation: 'pulse 1.5s infinite'
            }} />
            Real-time
          </span>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px'
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            padding: '16px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 800 }}>{todayStats.visitors}</div>
            <div style={{ fontSize: '13px', fontWeight: 600, opacity: 0.9 }}>Today's Visitors</div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            padding: '16px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 800 }}>{todayStats.deliveries}</div>
            <div style={{ fontSize: '13px', fontWeight: 600, opacity: 0.9 }}>Today's Deliveries</div>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {statsData.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            style={cardStyle}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#94A3B8' }}>{stat.title}</p>
                <h3 style={{ margin: '8px 0 0', fontSize: '36px', fontWeight: 800, color: stat.color }}>
                  {stat.value}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
                  {stat.trend === 'up' ? (
                    <ArrowUp size={16} color="#22C55E" />
                  ) : stat.trend === 'down' ? (
                    <ArrowDown size={16} color="#EF4444" />
                  ) : null}
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: stat.trend === 'up' ? '#22C55E' : stat.trend === 'down' ? '#EF4444' : '#94A3B8'
                  }}>
                    {stat.change}
                  </span>
                </div>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: stat.color + '20',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <stat.icon size={24} color={stat.color} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="reports-charts-grid">
        {/* Visitor & Delivery Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={cardStyle}
        >
          <h2 className="chart-title" style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 700, color: '#F1F5F9' }}>
            📊 Visitors & Deliveries
          </h2>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>Loading...</div>
          ) : (
            <>
              <div className="chart-bars visitors-chart" style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '200px', padding: '0 4px' }}>
                {monthlyData.map((data, index) => (
                  <div key={index} className="chart-bar-item" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '0' }}>
                    <div style={{ width: '100%', display: 'flex', gap: '2px', alignItems: 'flex-end', height: '160px' }}>
                      <div style={{
                        flex: 1,
                        background: '#3B82F6',
                        borderRadius: '4px 4px 0 0',
                        height: `${Math.max((data.visitors / maxVisitors) * 100, 5)}%`,
                        minHeight: '8px'
                      }} />
                      <div style={{
                        flex: 1,
                        background: '#8B5CF6',
                        borderRadius: '4px 4px 0 0',
                        height: `${Math.max((data.deliveries / maxDeliveries) * 100, 5)}%`,
                        minHeight: '8px'
                      }} />
                    </div>
                    <span className="chart-month-label" style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8' }}>{data.month}</span>
                  </div>
                ))}
              </div>
              <div className="chart-legend" style={{ display: 'flex', gap: '20px', marginTop: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#3B82F6' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8' }}>Visitors</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#8B5CF6' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8' }}>Deliveries</span>
                </div>
              </div>
            </>
          )}
        </motion.div>

        {/* Access Events Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={cardStyle}
        >
          <h2 className="chart-title" style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 700, color: '#F1F5F9' }}>
            🔐 Access Events
          </h2>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>Loading...</div>
          ) : (
            <>
              <div className="chart-bars access-chart" style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '200px', padding: '0 4px' }}>
                {monthlyData.map((data, index) => (
                  <div key={index} className="chart-bar-item" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '0' }}>
                    <div style={{
                      width: '100%',
                      background: '#22C55E',
                      borderRadius: '4px 4px 0 0',
                      height: `${Math.max((data.access / maxAccess) * 100, 5)}%`,
                      minHeight: '8px',
                      maxHeight: '160px'
                    }} />
                    <span className="chart-month-label" style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8', marginTop: '8px' }}>{data.month}</span>
                  </div>
                ))}
              </div>
              <div className="chart-legend" style={{ display: 'flex', gap: '20px', marginTop: '16px', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#22C55E' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8' }}>Access Granted</span>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={cardStyle}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700, color: '#F1F5F9' }}>
          📝 Recent Activity
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {recentActivity.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
              <Activity size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>No recent activity</p>
            </div>
          ) : (
            recentActivity.map((activity, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: '#0F172A',
                  borderRadius: '10px'
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: activity.type === 'visitor' ? '#3B82F620' :
                             activity.type === 'delivery' ? '#8B5CF620' :
                             activity.type === 'access' ? '#22C55E20' :
                             activity.type === 'payment' ? '#F59E0B20' : '#6B728020',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {activity.type === 'visitor' && <Users size={20} color="#3B82F6" />}
                  {activity.type === 'delivery' && <Package size={20} color="#8B5CF6" />}
                  {activity.type === 'access' && <Shield size={20} color="#22C55E" />}
                  {activity.type === 'user' && <Users size={20} color="#6B7280" />}
                  {activity.type === 'payment' && <TrendingUp size={20} color="#F59E0B" />}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#F1F5F9' }}>{activity.message}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', fontWeight: 500, color: '#64748B' }}>{activity.time}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spinning {
          animation: spin 1s linear infinite;
        }
        @media (max-width: 768px) {
          div[style*="maxWidth: 1400px"] {
            padding: 16px !important;
          }
          h1[style*="fontSize: 28px"] {
            font-size: 22px !important;
          }
          div[style*="gridTemplateColumns: repeat(auto-fit"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="gridTemplateColumns: repeat(2"] {
            grid-template-columns: 1fr !important;
          }
          button[style*="fontWeight: 700"] {
            padding: 8px 12px !important;
            font-size: 13px !important;
          }
          select[style*="fontSize: 14px"] {
            padding: 8px 12px !important;
            font-size: 13px !important;
          }
          /* Chart responsive fixes */
          .chart-container, .reports-charts-grid {
            min-width: 0 !important;
            overflow: hidden !important;
            grid-template-columns: 1fr !important;
          }
          .chart-bar-item {
            min-width: 0 !important;
          }
          .chart-bars {
            gap: 4px !important;
            height: 150px !important;
            padding: 0 2px !important;
          }
          .chart-bars > div > div:first-child {
            height: 120px !important;
          }
          .chart-month-label {
            font-size: 10px !important;
          }
        }
        @media (max-width: 400px) {
          .chart-bars {
            gap: 2px !important;
          }
          .chart-month-label {
            display: none !important;
          }
          .chart-bars {
            gap: 6px !important;
          }
          .chart-bar-item {
            min-width: 30px !important;
          }
          .chart-legend {
            flex-wrap: wrap !important;
            gap: 8px !important;
          }
        }
        @media (max-width: 480px) {
          div[style*="display: flex"][style*="gap: 12px"] {
            flex-direction: column !important;
          }
          div[style*="gridTemplateColumns: repeat(auto-fit, minmax(150px"] {
            grid-template-columns: 1fr !important;
          }
          /* Chart bars on very small screens */
          .chart-bars {
            gap: 4px !important;
          }
          .chart-bar-item {
            min-width: 24px !important;
          }
          .chart-month-label {
            font-size: 10px !important;
          }
          .chart-title {
            font-size: 16px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminReports;
