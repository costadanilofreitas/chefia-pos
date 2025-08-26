import type { Meta, StoryObj } from '@storybook/react-vite';
import Button from './Button';
import Card, { CardHeader, CardTitle, CardContent, CardFooter } from './Card';

const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'bordered', 'elevated', 'glass'],
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Card Title</h3>
        <p className="text-gray-600 dark:text-gray-400">
          This is a default card with some content inside.
        </p>
      </div>
    ),
  },
};

export const Bordered: Story = {
  args: {
    variant: 'bordered',
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Bordered Card</h3>
        <p className="text-gray-600 dark:text-gray-400">
          This card has a border instead of a shadow.
        </p>
      </div>
    ),
  },
};

export const Elevated: Story = {
  args: {
    variant: 'elevated',
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Elevated Card</h3>
        <p className="text-gray-600 dark:text-gray-400">
          This card has a stronger shadow for emphasis.
        </p>
      </div>
    ),
  },
};

export const Glass: Story = {
  args: {
    variant: 'glass',
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Glass Card</h3>
        <p className="text-gray-600 dark:text-gray-400">
          This card has a glassmorphism effect with backdrop blur.
        </p>
      </div>
    ),
  },
};

export const WithHeaderAndFooter: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Complete Card Example</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 dark:text-gray-400">
          This is a complete card with header, content, and footer sections.
          It demonstrates the full card structure with all available components.
        </p>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="ghost" size="sm">Cancel</Button>
        <Button variant="primary" size="sm">Save</Button>
      </CardFooter>
    </Card>
  ),
};

export const ProductCard: Story = {
  render: () => (
    <Card variant="elevated" className="w-64">
      <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-t-xl overflow-hidden">
        <div className="w-full h-full flex items-center justify-center text-6xl">
          🍕
        </div>
      </div>
      <CardContent>
        <h3 className="font-semibold text-lg">Pizza Margherita</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Fresh mozzarella, tomato sauce, and basil
        </p>
        <div className="flex justify-between items-center mt-4">
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            R$ 45,90
          </span>
          <Button size="sm" variant="primary">
            Add to Cart
          </Button>
        </div>
      </CardContent>
    </Card>
  ),
};

export const StatsCard: Story = {
  render: () => (
    <Card variant="bordered" className="w-72">
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Sales</p>
            <p className="text-2xl font-bold">R$ 12,345.67</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              +12.5% from last month
            </p>
          </div>
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardContent>
          <h4 className="font-semibold mb-2">Default Card</h4>
          <p className="text-sm text-gray-600">Standard card with shadow</p>
        </CardContent>
      </Card>
      
      <Card variant="bordered">
        <CardContent>
          <h4 className="font-semibold mb-2">Bordered Card</h4>
          <p className="text-sm text-gray-600">Card with border</p>
        </CardContent>
      </Card>
      
      <Card variant="elevated">
        <CardContent>
          <h4 className="font-semibold mb-2">Elevated Card</h4>
          <p className="text-sm text-gray-600">Card with strong shadow</p>
        </CardContent>
      </Card>
      
      <Card variant="glass">
        <CardContent>
          <h4 className="font-semibold mb-2">Glass Card</h4>
          <p className="text-sm text-gray-600">Glassmorphism effect</p>
        </CardContent>
      </Card>
    </div>
  ),
};