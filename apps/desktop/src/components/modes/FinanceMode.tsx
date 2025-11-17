import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import {
  Container,
  Title,
  Card,
  Text,
  Button,
  Group,
  Stack,
  Select,
  NumberInput,
  TextInput,
  Grid,
  Modal,
  Badge,
  Table,
  Center,
  Loader,
  Progress,
} from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { IconPlus, IconTrendingUp, IconWallet, IconReceipt } from '@tabler/icons-react';
import { logger } from '@/utils/logger';

interface Transaction {
  id: string;
  space_id: string;
  transaction_type: string;
  amount: number;
  currency: string;
  category: string;
  account: string;
  description?: string;
  date: number;
  recurring: boolean;
  created_at: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

const categories = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Income',
  'Savings',
  'Other',
];

const FinanceMode: React.FC<{ spaceId: string }> = ({ spaceId }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, setModalOpened] = useState(false);

  // Form state
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formCurrency, setFormCurrency] = useState('USD');
  const [formCategory, setFormCategory] = useState(categories[0]);
  const [formAccount, setFormAccount] = useState('Cash');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState<Date>(new Date());

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await invoke<Transaction[]>('get_transactions_cmd', {
        spaceId,
        limit: 100,
      });
      setTransactions(data);
    } catch (error) {
      logger.error('Failed to load transactions:', error as Error);
    } finally {
      setLoading(false);
    }
  };

  const addTransaction = async () => {
    try {
      // Validate amount
      const amountNumber = Number(formAmount);
      if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
        alert('Please enter a valid amount greater than 0.');
        return;
      }
      // Convert to integer cents (minor units) to avoid float precision errors
      const amountInCents = Math.round(amountNumber * 100);

      // Validate and normalize string fields to prevent empty or invalid data
      const currency = String(formCurrency || '')
        .trim()
        .toUpperCase();
      const category = String(formCategory || '').trim();
      const account = String(formAccount || '').trim();

      // Validate currency format (must be 3-letter ISO code)
      if (!/^[A-Z]{3}$/.test(currency)) {
        alert('Please enter a valid 3-letter currency code (e.g., USD, EUR, GBP).');
        return;
      }

      // Validate category is not empty
      if (!category) {
        alert('Please select a category.');
        return;
      }

      // Validate account is not empty
      if (!account) {
        alert('Please enter an account name.');
        return;
      }

      // Validate date
      if (!formDate || Number.isNaN(formDate.getTime())) {
        alert('Please select a valid date.');
        return;
      }
      const unixDate = Math.floor(formDate.getTime() / 1000);

      await invoke('create_transaction_cmd', {
        spaceId,
        transactionType: formType,
        amount: amountInCents,
        currency,
        category,
        account,
        date: unixDate,
      });

      setModalOpened(false);
      setFormAmount(0);
      setFormDescription('');
      await loadData();
    } catch (error) {
      logger.error('Failed to add transaction:', error as Error);
      alert(`Failed to add transaction: ${String(error)}`);
    }
  };

  const calculateTotals = () => {
    const income = transactions.filter((t) => t.transaction_type === 'income').reduce((sum, t) => sum + t.amount, 0);

    const expenses = transactions.filter((t) => t.transaction_type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    return { income, expenses, balance: income - expenses };
  };

  const getCategoryBreakdown = () => {
    const breakdown: Record<string, number> = {};

    for (const t of transactions.filter((t) => t.transaction_type === 'expense')) {
      breakdown[t.category] = (breakdown[t.category] || 0) + t.amount;
    }

    return Object.entries(breakdown).map(([name, value]) => ({
      name,
      value,
    }));
  };

  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  const totals = calculateTotals();
  const categoryData = getCategoryBreakdown();

  return (
    <Container size="xl" py="xl">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <div>
            <Title order={2}>Finance Tracker</Title>
            <Text c="dimmed" size="sm">
              Manage your income, expenses, and budgets
            </Text>
          </div>
          <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpened(true)}>
            Add Transaction
          </Button>
        </Group>

        {/* Summary Cards */}
        <Grid>
          <Grid.Col span={4}>
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Stack gap={4}>
                <Group gap={4}>
                  <IconTrendingUp size={16} color="green" />
                  <Text size="xs" c="dimmed" tt="uppercase">
                    Income
                  </Text>
                </Group>
                <Text size="xl" fw={700} c="green">
                  ${totals.income.toFixed(2)}
                </Text>
                <Text size="xs" c="dimmed">
                  Total income
                </Text>
              </Stack>
            </Card>
          </Grid.Col>
          <Grid.Col span={4}>
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Stack gap={4}>
                <Group gap={4}>
                  <IconReceipt size={16} color="red" />
                  <Text size="xs" c="dimmed" tt="uppercase">
                    Expenses
                  </Text>
                </Group>
                <Text size="xl" fw={700} c="red">
                  ${totals.expenses.toFixed(2)}
                </Text>
                <Text size="xs" c="dimmed">
                  Total expenses
                </Text>
              </Stack>
            </Card>
          </Grid.Col>
          <Grid.Col span={4}>
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Stack gap={4}>
                <Group gap={4}>
                  <IconWallet size={16} />
                  <Text size="xs" c="dimmed" tt="uppercase">
                    Balance
                  </Text>
                </Group>
                <Text size="xl" fw={700} c={totals.balance >= 0 ? 'green' : 'red'}>
                  ${totals.balance.toFixed(2)}
                </Text>
                <Text size="xs" c="dimmed">
                  Net balance
                </Text>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Category Breakdown */}
        {categoryData.length > 0 && (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">
              Expense Breakdown by Category
            </Title>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Recent Transactions */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={4} mb="md">
            Recent Transactions
          </Title>
          {transactions.length > 0 ? (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Category</Table.Th>
                  <Table.Th>Account</Table.Th>
                  <Table.Th>Amount</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {transactions
                  .sort((a, b) => b.date - a.date)
                  .slice(0, 20)
                  .map((transaction) => (
                    <Table.Tr key={transaction.id}>
                      <Table.Td>{new Date(transaction.date * 1000).toLocaleDateString()}</Table.Td>
                      <Table.Td>
                        <Badge color={transaction.transaction_type === 'income' ? 'green' : 'red'} variant="light">
                          {transaction.transaction_type}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{transaction.category}</Table.Td>
                      <Table.Td>{transaction.account}</Table.Td>
                      <Table.Td>
                        <Text fw={600} c={transaction.transaction_type === 'income' ? 'green' : 'red'}>
                          {transaction.transaction_type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
              </Table.Tbody>
            </Table>
          ) : (
            <Center h={100}>
              <Text c="dimmed">No transactions yet</Text>
            </Center>
          )}
        </Card>
      </Stack>

      {/* Add Transaction Modal */}
      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title="Add Transaction">
        <Stack gap="md">
          <Select
            label="Type"
            value={formType}
            onChange={(value) => setFormType(value as 'income' | 'expense')}
            data={[
              { value: 'income', label: 'Income' },
              { value: 'expense', label: 'Expense' },
            ]}
            required
          />

          <NumberInput
            label="Amount"
            value={formAmount}
            onChange={(value) => setFormAmount(Number(value))}
            min={0}
            step={0.01}
            prefix="$"
            required
          />

          <Select
            label="Category"
            value={formCategory}
            onChange={(value) => setFormCategory(value || categories[0])}
            data={categories}
            required
          />

          <TextInput
            label="Account"
            value={formAccount}
            onChange={(e) => setFormAccount(e.currentTarget.value)}
            placeholder="Cash, Bank, Credit Card"
            required
          />

          <TextInput
            label="Description"
            value={formDescription}
            onChange={(e) => setFormDescription(e.currentTarget.value)}
            placeholder="Optional notes"
          />

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={addTransaction} disabled={formAmount === 0}>
              Add Transaction
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
};

export default FinanceMode;
