import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  Group,
  Stack,
  Text,
  Title,
  Badge,
  Progress,
  TextInput,
  Alert,
  LoadingOverlay,
  Table,
  ActionIcon,
  Tooltip,
  Modal,
  FileButton,
} from '@mantine/core';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { IconUpload, IconSearch, IconCheck, IconX, IconClock, IconFile, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface OcrResult {
  id: string;
  blob_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  text: string | null;
  confidence: number | null;
  language: string | null;
  processed_at: number | null;
  error_message: string | null;
}

export function OcrManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<OcrResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [language, setLanguage] = useState('eng');
  const [isUploading, setIsUploading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<OcrResult | null>(null);

  // Search OCR text
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      notifications.show({
        title: 'Search query required',
        message: 'Please enter a search query',
        color: 'yellow',
      });
      return;
    }

    setIsSearching(true);
    try {
      const results = await invoke<OcrResult[]>('search_ocr_text_cmd', {
        query: searchQuery,
        limit: 50,
      });
      setSearchResults(results);

      if (results.length === 0) {
        notifications.show({
          title: 'No results',
          message: 'No OCR results found matching your query',
          color: 'blue',
        });
      }
    } catch (error) {
      notifications.show({
        title: 'Search failed',
        message: String(error),
        color: 'red',
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Queue OCR for an image
  const handleQueueOcr = async (blobId: string) => {
    try {
      await invoke('queue_ocr_cmd', { blobId });
      notifications.show({
        title: 'OCR queued',
        message: 'Image has been queued for OCR processing',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Queue failed',
        message: String(error),
        color: 'red',
      });
    }
  };

  // Process OCR for an uploaded image
  const handleProcessOcr = async () => {
    setIsUploading(true);
    try {
      // For Tauri, we need to get the file path
      // Open file dialog to select image
      const filePath = await open({
        title: 'Select Image for OCR',
        multiple: false,
        filters: [{
          name: 'Images',
          extensions: ['png', 'jpg', 'jpeg', 'tiff', 'bmp']
        }]
      });

      if (!filePath) {
        setIsUploading(false);
        return;
      }

      // Generate a unique blob ID
      const blobId = `blob_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const result = await invoke<string>('process_ocr_cmd', {
        blobId,
        imagePath: filePath,
        language: language || undefined,
      });

      // Get the status to verify completion before notifying
      const status = await invoke<OcrResult>('get_ocr_status_cmd', { blobId });
      setCurrentStatus(status);

      // Only notify success after verifying the status
      if (status.status === 'completed') {
        notifications.show({
          title: 'OCR completed',
          message: 'Successfully extracted text from image',
          color: 'green',
        });
        setUploadModalOpen(false);
      } else if (status.status === 'failed') {
        notifications.show({
          title: 'OCR failed',
          message: status.error_message ?? 'OCR processing failed',
          color: 'red',
        });
      } else {
        notifications.show({
          title: 'OCR queued',
          message: 'Image is queued or processing; results will appear shortly',
          color: 'blue',
        });
      }
    } catch (error) {
      notifications.show({
        title: 'OCR processing failed',
        message: String(error),
        color: 'red',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Get status badge with robust handling of unknown/malformed status values
  const getStatusBadge = (rawStatus: string) => {
    // Normalize status to lowercase and handle null/undefined
    const normalizedStatus = (rawStatus ?? '').toLowerCase().trim();

    const colors: Record<string, string> = {
      queued: 'blue',
      processing: 'yellow',
      completed: 'green',
      failed: 'red',
    };

    // Validate status is a known value
    const validStatuses = ['queued', 'processing', 'completed', 'failed'];
    const isValidStatus = validStatuses.includes(normalizedStatus);

    const color = isValidStatus ? colors[normalizedStatus] : 'gray';
    const label = isValidStatus ? normalizedStatus : 'unknown';

    return <Badge color={color}>{label}</Badge>;
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    const icons = {
      queued: <IconClock size={16} />,
      processing: <IconClock size={16} />,
      completed: <IconCheck size={16} />,
      failed: <IconX size={16} />,
    };
    return icons[status as keyof typeof icons] || <IconFile size={16} />;
  };

  return (
    <Box>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <Box>
            <Title order={2}>OCR Manager</Title>
            <Text size="sm" c="dimmed">
              Extract text from images using Tesseract OCR
            </Text>
          </Box>
          <Button
            leftSection={<IconUpload size={16} />}
            onClick={() => setUploadModalOpen(true)}
          >
            Process Image
          </Button>
        </Group>

        {/* Info Alert */}
        <Alert color="blue" title="About OCR">
          OCR (Optical Character Recognition) extracts text from images. Upload images containing text
          (documents, screenshots, photos) to make them searchable. Supported formats: PNG, JPG, TIFF, BMP.
          Requires Tesseract to be installed on your system.
        </Alert>

        {/* Current Status */}
        {currentStatus && (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="sm">
              <Group justify="space-between">
                <Text fw={700}>Last Processed Image</Text>
                {getStatusBadge(currentStatus.status)}
              </Group>

              {currentStatus.status === 'completed' && currentStatus.text && (
                <>
                  <Text size="sm" c="dimmed">
                    Confidence: {currentStatus.confidence ? `${(currentStatus.confidence * 100).toFixed(1)}%` : 'N/A'}
                  </Text>
                  <Box
                    p="md"
                    style={{
                      backgroundColor: 'var(--mantine-color-gray-0)',
                      borderRadius: '4px',
                      maxHeight: '200px',
                      overflow: 'auto',
                    }}
                  >
                    <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                      {currentStatus.text}
                    </Text>
                  </Box>
                </>
              )}

              {currentStatus.status === 'failed' && currentStatus.error_message && (
                <Alert color="red" title="Error">
                  {currentStatus.error_message}
                </Alert>
              )}
            </Stack>
          </Card>
        )}

        {/* Search Section */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Title order={3}>Search OCR Results</Title>
            <Group>
              <TextInput
                placeholder="Search extracted text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                style={{ flex: 1 }}
                leftSection={<IconSearch size={16} />}
              />
              <Button onClick={handleSearch} loading={isSearching}>
                Search
              </Button>
            </Group>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <Box>
                <Text size="sm" c="dimmed" mb="sm">
                  Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                </Text>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Blob ID</Table.Th>
                      <Table.Th>Language</Table.Th>
                      <Table.Th>Confidence</Table.Th>
                      <Table.Th>Text Preview</Table.Th>
                      <Table.Th>Processed</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {searchResults.map((result) => (
                      <Table.Tr key={result.id}>
                        <Table.Td>{getStatusBadge(result.status)}</Table.Td>
                        <Table.Td>
                          <Text size="xs" style={{ fontFamily: 'monospace' }}>
                            {result.blob_id.substring(0, 12)}...
                          </Text>
                        </Table.Td>
                        <Table.Td>{result.language || 'N/A'}</Table.Td>
                        <Table.Td>
                          {result.confidence ? `${(result.confidence * 100).toFixed(1)}%` : 'N/A'}
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" lineClamp={2}>
                            {result.text ? result.text.substring(0, 100) + '...' : 'No text'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          {result.processed_at
                            ? new Date(result.processed_at * 1000).toLocaleString()
                            : 'Pending'}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Box>
            )}
          </Stack>
        </Card>

        {/* Upload Modal */}
        <Modal
          opened={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          title="Process Image with OCR"
          size="md"
        >
          <Stack gap="md">
            <Alert color="blue">
              Select an image file to extract text. Supported formats: PNG, JPG, JPEG, TIFF, BMP
            </Alert>

            <TextInput
              label="Language Code"
              description="OCR language (e.g., 'eng' for English, 'fra' for French)"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="eng"
            />

            <Text size="sm" c="dimmed">
              Make sure Tesseract OCR is installed on your system. Visit{' '}
              <a href="https://github.com/tesseract-ocr/tesseract" target="_blank" rel="noopener noreferrer">
                Tesseract GitHub
              </a>{' '}
              for installation instructions.
            </Text>

            <Group justify="flex-end">
              <Button variant="default" onClick={() => setUploadModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleProcessOcr}
                loading={isUploading}
                leftSection={<IconUpload size={16} />}
              >
                Process Image
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Box>
  );
}
