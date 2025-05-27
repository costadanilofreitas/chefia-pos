import React from 'react';
import { Box, Typography, Button, useTheme } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
         LineChart, Line, PieChart, Pie, Cell, Sector, 
         AreaChart, Area, ScatterChart, Scatter, 
         RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { DataGrid } from '@mui/x-data-grid';

const ChartComponent = ({ chartType, data, options }) => {
  const theme = useTheme();
  
  // Handle error state
  if (data?.error) {
    return (
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        p: 2
      }}>
        <Typography variant="body1" color="error" gutterBottom>
          {data.error}
        </Typography>
        <Button variant="outlined" size="small">
          Tentar Novamente
        </Button>
      </Box>
    );
  }
  
  // Handle empty data
  if (!data || !data.data || data.data.length === 0) {
    return (
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        p: 2
      }}>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Sem dados para exibir
        </Typography>
      </Box>
    );
  }
  
  // Render appropriate chart based on type
  switch (chartType) {
    case 'bar':
      return renderBarChart(data, options);
    case 'line':
      return renderLineChart(data, options);
    case 'pie':
      return renderPieChart(data, options);
    case 'area':
      return renderAreaChart(data, options);
    case 'scatter':
      return renderScatterChart(data, options);
    case 'radar':
      return renderRadarChart(data, options);
    case 'table':
      return renderTable(data, options);
    default:
      return renderBarChart(data, options);
  }
  
  // Bar Chart
  function renderBarChart(data, options) {
    const { horizontal = false, stacked = false, showValues = true, colors = theme.palette.chart.default } = options || {};
    
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data.data}
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          {horizontal ? (
            <>
              <XAxis type="number" />
              <YAxis dataKey={data.dimensions[0]} type="category" />
            </>
          ) : (
            <>
              <XAxis dataKey={data.dimensions[0]} />
              <YAxis />
            </>
          )}
          <Tooltip />
          <Legend />
          {data.measures.map((measure, index) => (
            <Bar 
              key={measure}
              dataKey={measure}
              name={data.labels?.[measure] || measure}
              fill={colors[index % colors.length]}
              stackId={stacked ? 'stack' : undefined}
              label={showValues ? { position: 'top', fill: theme.palette.text.primary } : false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }
  
  // Line Chart
  function renderLineChart(data, options) {
    const { showPoints = true, showArea = false, smooth = false, colors = theme.palette.chart.default } = options || {};
    
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data.data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={data.dimensions[0]} />
          <YAxis />
          <Tooltip />
          <Legend />
          {data.measures.map((measure, index) => (
            <Line 
              key={measure}
              type={smooth ? "monotone" : "linear"}
              dataKey={measure}
              name={data.labels?.[measure] || measure}
              stroke={colors[index % colors.length]}
              dot={showPoints}
              activeDot={{ r: 8 }}
              strokeWidth={2}
            />
          ))}
          {showArea && data.measures.map((measure, index) => (
            <Area 
              key={`area-${measure}`}
              type={smooth ? "monotone" : "linear"}
              dataKey={measure}
              fill={colors[index % colors.length]}
              stroke="none"
              fillOpacity={0.2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }
  
  // Pie Chart
  function renderPieChart(data, options) {
    const { donut = false, showLabels = true, showLegend = true, colors = theme.palette.chart.default } = options || {};
    
    // For pie charts, we need a different data structure
    const pieData = data.data.map(item => ({
      name: item[data.dimensions[0]],
      value: item[data.measures[0]]
    }));
    
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
      const RADIAN = Math.PI / 180;
      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);
      
      return showLabels ? (
        <text 
          x={x} 
          y={y} 
          fill={theme.palette.background.paper}
          textAnchor={x > cx ? 'start' : 'end'} 
          dominantBaseline="central"
        >
          {`${(percent * 100).toFixed(0)}%`}
        </text>
      ) : null;
    };
    
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={80}
            innerRadius={donut ? 40 : 0}
            fill="#8884d8"
            dataKey="value"
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          {showLegend && <Legend />}
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    );
  }
  
  // Area Chart
  function renderAreaChart(data, options) {
    const { stacked = false, smooth = false, colors = theme.palette.chart.default } = options || {};
    
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data.data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={data.dimensions[0]} />
          <YAxis />
          <Tooltip />
          <Legend />
          {data.measures.map((measure, index) => (
            <Area 
              key={measure}
              type={smooth ? "monotone" : "linear"}
              dataKey={measure}
              name={data.labels?.[measure] || measure}
              stackId={stacked ? "1" : undefined}
              stroke={colors[index % colors.length]}
              fill={colors[index % colors.length]}
              fillOpacity={0.6}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }
  
  // Scatter Chart
  function renderScatterChart(data, options) {
    const { colors = theme.palette.chart.default } = options || {};
    
    // For scatter charts, we need at least two measures
    if (data.measures.length < 2) {
      return (
        <Box sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          p: 2
        }}>
          <Typography variant="body1" color="error" gutterBottom>
            Gráfico de dispersão requer pelo menos duas medidas
          </Typography>
        </Box>
      );
    }
    
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid />
          <XAxis 
            type="number" 
            dataKey={data.measures[0]} 
            name={data.labels?.[data.measures[0]] || data.measures[0]} 
          />
          <YAxis 
            type="number" 
            dataKey={data.measures[1]} 
            name={data.labels?.[data.measures[1]] || data.measures[1]} 
          />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Legend />
          <Scatter 
            name={`${data.measures[0]} vs ${data.measures[1]}`} 
            data={data.data} 
            fill={colors[0]} 
          />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }
  
  // Radar Chart
  function renderRadarChart(data, options) {
    const { colors = theme.palette.chart.default } = options || {};
    
    return (
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data.data}>
          <PolarGrid />
          <PolarAngleAxis dataKey={data.dimensions[0]} />
          <PolarRadiusAxis />
          {data.measures.map((measure, index) => (
            <Radar 
              key={measure}
              name={data.labels?.[measure] || measure}
              dataKey={measure}
              stroke={colors[index % colors.length]}
              fill={colors[index % colors.length]}
              fillOpacity={0.6}
            />
          ))}
          <Legend />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    );
  }
  
  // Table
  function renderTable(data, options) {
    const { pagination = true, pageSize = 10, striped = true, bordered = false } = options || {};
    
    // Create columns from dimensions and measures
    const columns = [
      ...data.dimensions.map(dim => ({
        field: dim,
        headerName: data.labels?.[dim] || dim,
        flex: 1,
        minWidth: 150
      })),
      ...data.measures.map(measure => ({
        field: measure,
        headerName: data.labels?.[measure] || measure,
        flex: 1,
        minWidth: 120,
        type: 'number',
        valueFormatter: (params) => {
          if (typeof params.value === 'number') {
            return params.value.toLocaleString();
          }
          return params.value;
        }
      }))
    ];
    
    // Add id to each row if not present
    const rows = data.data.map((row, index) => ({
      id: row.id || index,
      ...row
    }));
    
    return (
      <Box sx={{ height: '100%', width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          pagination={pagination}
          pageSize={pageSize}
          rowsPerPageOptions={[5, 10, 20, 50, 100]}
          disableSelectionOnClick
          getRowClassName={(params) => 
            striped && params.indexRelativeToCurrentPage % 2 === 0 ? 'even-row' : ''
          }
          sx={{
            '& .even-row': {
              backgroundColor: theme.palette.action.hover,
            },
            border: bordered ? `1px solid ${theme.palette.divider}` : 'none',
            '& .MuiDataGrid-cell': {
              borderBottom: bordered ? `1px solid ${theme.palette.divider}` : 'none',
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: theme.palette.background.default,
              borderBottom: `1px solid ${theme.palette.divider}`,
            }
          }}
        />
      </Box>
    );
  }
};

export default ChartComponent;
