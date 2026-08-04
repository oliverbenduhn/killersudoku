// Hilfe-Dialog: zeigt die Tastenkombinationen an.
//
// Single-Source-of-Truth: importiert KEYBOARD_SHORTCUTS aus
// keyboardShortcuts.ts — dieselbe Liste, die der window-Listener
// in Board.tsx verarbeitet. So kann der Dialog nicht aus der
// Implementierung herausdriften.
//
// Modal statt Drawer: die Liste passt in eine kleine Box, kein
// Bottom-Sheet-Charakter nötig. Esc schließt (Chakra-Default für
// Modal via closeOnEsc).

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Box,
} from '@chakra-ui/react';
import { KEYBOARD_SHORTCUTS, formatShortcutKeys } from '../Board/keyboardShortcuts';

interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const GROUP_COLORS: Record<string, string> = {
  Spielzug: 'brand.primary',
  Hilfe: 'blue',
  Modus: 'orange',
};

export function HelpDialog({ isOpen, onClose }: HelpDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay />
      <ModalContent borderRadius="xl" maxH="80vh" overflowY="auto">
        <ModalHeader fontFamily="heading" letterSpacing="-0.02em">
          Tastenkombinationen
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Table size="sm" variant="simple">
            <Thead>
              <Tr>
                <Th pl={0} pr={2} width="160px">Taste</Th>
                <Th pl={2}>Wirkung</Th>
              </Tr>
            </Thead>
            <Tbody>
              {KEYBOARD_SHORTCUTS.map((s, i) => (
                <Tr key={i}>
                  <Td pl={0} pr={2} py={2} verticalAlign="top">
                    <Box
                      as="kbd"
                      fontFamily="mono"
                      fontSize="sm"
                      bg="surface.sunken"
                      borderRadius="md"
                      px={2}
                      py={1}
                      borderBottom="2px solid"
                      borderColor="blackAlpha.200"
                      whiteSpace="nowrap"
                      display="inline-block"
                    >
                      {formatShortcutKeys(s.keys)}
                    </Box>
                  </Td>
                  <Td pl={2} py={2}>
                    {s.label}{' '}
                    <Badge
                      ml={1}
                      fontSize="2xs"
                      colorScheme={GROUP_COLORS[s.group] ?? 'gray'}
                      variant="subtle"
                    >
                      {s.group}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export default HelpDialog;
