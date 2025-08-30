import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SearchInput } from '../../src/components/ui/SearchInput';

describe('SearchInput Component', () => {
  const mockOnChange = jest.fn();
  const mockOnClear = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders with placeholder', () => {
    render(
      <SearchInput
        placeholder="Search products..."
        value=""
        onChange={mockOnChange}
      />
    );

    expect(screen.getByPlaceholderText('Search products...')).toBeInTheDocument();
  });

  test('displays value correctly', () => {
    render(
      <SearchInput
        placeholder="Search"
        value="test query"
        onChange={mockOnChange}
      />
    );

    const input = screen.getByDisplayValue('test query');
    expect(input).toBeInTheDocument();
  });

  test('calls onChange when typing', () => {
    render(
      <SearchInput
        placeholder="Search"
        value=""
        onChange={mockOnChange}
      />
    );

    const input = screen.getByPlaceholderText('Search');
    fireEvent.change(input, { target: { value: 'new text' } });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    // onChange receives the actual event, just check it was called
    expect(mockOnChange).toHaveBeenCalled();
  });

  test('shows clear button when value is not empty', () => {
    render(
      <SearchInput
        placeholder="Search"
        value="some text"
        onChange={mockOnChange}
        onClear={mockOnClear}
      />
    );

    const clearButton = screen.getByLabelText('Limpar busca');
    expect(clearButton).toBeInTheDocument();
  });

  test('hides clear button when value is empty', () => {
    render(
      <SearchInput
        placeholder="Search"
        value=""
        onChange={mockOnChange}
        onClear={mockOnClear}
      />
    );

    const clearButton = screen.queryByLabelText('Limpar busca');
    expect(clearButton).not.toBeInTheDocument();
  });

  test('calls onClear when clear button is clicked', () => {
    render(
      <SearchInput
        placeholder="Search"
        value="test"
        onChange={mockOnChange}
        onClear={mockOnClear}
      />
    );

    const clearButton = screen.getByLabelText('Limpar busca');
    fireEvent.click(clearButton);

    expect(mockOnClear).toHaveBeenCalledTimes(1);
  });

  test('applies fullWidth class when prop is true', () => {
    const { container } = render(
      <SearchInput
        placeholder="Search"
        value=""
        onChange={mockOnChange}
        fullWidth
      />
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('w-full');
  });

  test('does not apply fullWidth class when prop is false', () => {
    const { container } = render(
      <SearchInput
        placeholder="Search"
        value=""
        onChange={mockOnChange}
        fullWidth={false}
      />
    );

    const wrapper = container.firstChild;
    expect(wrapper).not.toHaveClass('w-full');
  });

  test('shows search icon', () => {
    render(
      <SearchInput
        placeholder="Search"
        value=""
        onChange={mockOnChange}
      />
    );

    const searchIcon = document.querySelector('.lucide-search');
    expect(searchIcon).toBeInTheDocument();
  });

  test('input has correct styling classes', () => {
    render(
      <SearchInput
        placeholder="Search"
        value=""
        onChange={mockOnChange}
      />
    );

    const input = screen.getByPlaceholderText('Search');
    expect(input).toHaveClass('pl-10'); // Padding for icon
    expect(input).toHaveClass('pr-10'); // Padding for clear button
    expect(input).toHaveClass('rounded-lg');
  });

  test('clear button is accessible', () => {
    render(
      <SearchInput
        placeholder="Search"
        value="test"
        onChange={mockOnChange}
        onClear={mockOnClear}
      />
    );

    const clearButton = screen.getByLabelText('Limpar busca');
    expect(clearButton).toHaveAttribute('type', 'button');
    expect(clearButton).toHaveAttribute('aria-label', 'Limpar busca');
  });
});