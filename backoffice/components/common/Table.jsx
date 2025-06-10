import React from 'react';
import tokens from '../styles/tokens';

/**
 * Table component for the POS Modern Backoffice
 * 
 * @param {Object} props - Component props
 * @param {Array} props.columns - Table column definitions
 * @param {Array} props.data - Table data
 * @param {boolean} [props.striped=true] - Whether table rows should be striped
 * @param {boolean} [props.hoverable=true] - Whether table rows should have hover effect
 * @param {boolean} [props.bordered=false] - Whether table should have borders
 * @param {boolean} [props.compact=false] - Whether table should be compact
 * @param {Function} [props.onRowClick] - Row click handler
 * @param {string} [props.className] - Additional CSS class names
 */
const Table = ({
  columns,
  data,
  striped = true,
  hoverable = true,
  bordered = false,
  compact = false,
  onRowClick,
  className = '',
  ...rest
}) => {
  // Base styles
  const tableStyles = {
    width: '100%',
    borderCollapse: 'collapse',
    borderSpacing: 0,
    fontFamily: tokens.typography.fontFamily,
    fontSize: tokens.typography.fontSize.md,
    border: bordered ? `1px solid ${tokens.colors.border.light}` : 'none',
    borderRadius: tokens.borderRadius.md,
    overflow: 'hidden',
  };

  const theadStyles = {
    backgroundColor: tokens.colors.neutral.gray100,
  };

  const thStyles = {
    padding: compact ? tokens.spacing.sm : tokens.spacing.md,
    textAlign: 'left',
    fontWeight: tokens.typography.fontWeightMedium,
    color: tokens.colors.text.primary,
    borderBottom: `1px solid ${tokens.colors.border.medium}`,
    whiteSpace: 'nowrap',
  };

  const tdStyles = {
    padding: compact ? tokens.spacing.sm : tokens.spacing.md,
    borderBottom: `1px solid ${tokens.colors.border.light}`,
    color: tokens.colors.text.primary,
  };

  const trEvenStyles = {
    backgroundColor: striped ? tokens.colors.neutral.gray50 : 'transparent',
  };

  const trHoverStyles = {
    '&:hover': {
      backgroundColor: hoverable ? tokens.colors.neutral.gray100 : 'inherit',
    },
  };

  // Create class names
  const tableClass = `pos-table ${striped ? 'pos-table-striped' : ''} ${hoverable ? 'pos-table-hoverable' : ''} ${bordered ? 'pos-table-bordered' : ''} ${compact ? 'pos-table-compact' : ''} ${className}`;

  return (
    <table className={tableClass} style={tableStyles} {...rest}>
      <thead style={theadStyles}>
        <tr>
          {columns.map((column, index) => (
            <th 
              key={index} 
              style={{
                ...thStyles,
                width: column.width,
                textAlign: column.align || 'left',
              }}
            >
              {column.title}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, rowIndex) => (
          <tr 
            key={rowIndex}
            onClick={onRowClick ? () => onRowClick(row, rowIndex) : undefined}
            style={{
              ...(rowIndex % 2 === 0 ? trEvenStyles : {}),
              cursor: onRowClick ? 'pointer' : 'default',
            }}
          >
            {columns.map((column, colIndex) => (
              <td 
                key={colIndex}
                style={{
                  ...tdStyles,
                  textAlign: column.align || 'left',
                }}
              >
                {column.render ? column.render(row[column.dataIndex], row, rowIndex) : row[column.dataIndex]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default Table;
