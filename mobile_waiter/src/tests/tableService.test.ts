import axios from 'axios';
import { fetchTables, fetchTableById, updateTableStatus } from '../services/tableService';
import { Table } from '../types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Table Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchTables', () => {
    test('returns table data when API call is successful', async () => {
      // Mock data
      const mockTables: Table[] = [
        {
          id: '1',
          number: '1',
          capacity: 4,
          status: 'available'
        },
        {
          id: '2',
          number: '2',
          capacity: 2,
          status: 'occupied',
          currentOrderId: '1001'
        }
      ];

      // Setup axios mock
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockTables,
          message: 'Tables fetched successfully'
        }
      });

      // Call the function
      const result = await fetchTables();

      // Assertions
      expect(mockedAxios.get).toHaveBeenCalledWith('/tables');
      expect(result).toEqual(mockTables);
    });

    test('throws error when API call fails', async () => {
      // Setup axios mock to simulate failure
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      // Call the function and expect it to throw
      await expect(fetchTables()).rejects.toThrow('Failed to fetch tables');
      expect(mockedAxios.get).toHaveBeenCalledWith('/tables');
    });
  });

  describe('fetchTableById', () => {
    test('returns table data when API call is successful', async () => {
      // Mock data
      const mockTable: Table = {
        id: '1',
        number: '1',
        capacity: 4,
        status: 'available'
      };

      // Setup axios mock
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockTable,
          message: 'Table fetched successfully'
        }
      });

      // Call the function
      const result = await fetchTableById('1');

      // Assertions
      expect(mockedAxios.get).toHaveBeenCalledWith('/tables/1');
      expect(result).toEqual(mockTable);
    });

    test('throws error when API call fails', async () => {
      // Setup axios mock to simulate failure
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      // Call the function and expect it to throw
      await expect(fetchTableById('1')).rejects.toThrow('Failed to fetch table details');
      expect(mockedAxios.get).toHaveBeenCalledWith('/tables/1');
    });
  });

  describe('updateTableStatus', () => {
    test('updates table status when API call is successful', async () => {
      // Mock data
      const tableId = '1';
      const newStatus = 'occupied';
      
      const mockUpdatedTable: Table = {
        id: tableId,
        number: '1',
        capacity: 4,
        status: newStatus
      };

      // Setup axios mock
      mockedAxios.patch.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockUpdatedTable,
          message: 'Table status updated successfully'
        }
      });

      // Call the function
      const result = await updateTableStatus(tableId, newStatus);

      // Assertions
      expect(mockedAxios.patch).toHaveBeenCalledWith(`/tables/${tableId}/status`, { status: newStatus });
      expect(result).toEqual(mockUpdatedTable);
      expect(result.status).toEqual(newStatus);
    });

    test('throws error when API call fails', async () => {
      // Setup axios mock to simulate failure
      mockedAxios.patch.mockRejectedValueOnce(new Error('Network error'));

      // Call the function and expect it to throw
      await expect(updateTableStatus('1', 'occupied')).rejects.toThrow('Failed to update table status');
      expect(mockedAxios.patch).toHaveBeenCalledWith('/tables/1/status', { status: 'occupied' });
    });
  });
});
