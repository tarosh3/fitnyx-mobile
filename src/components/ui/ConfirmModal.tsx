import { useThemeColors } from '@/src/hooks/useThemeColors';
import { AlertCircle, X } from 'lucide-react-native';
import React from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

interface ConfirmModalProps {
    visible: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: 'danger' | 'primary';
    showCancel?: boolean;
}

const NEON_LIME = '#5fc793';

export function ConfirmModal({
    visible,
    title,
    message,
    confirmLabel = 'CONFIRM',
    cancelLabel = 'CANCEL',
    onConfirm,
    onCancel,
    variant = 'primary',
    showCancel = true,
}: ConfirmModalProps) {
    const palette = useThemeColors();
    const styles = React.useMemo(() => getStyles(palette), [palette]);

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <Pressable style={styles.backdrop} onPress={onCancel} />

                <View style={styles.panel}>
                    <View style={styles.header}>
                        <View style={[
                            styles.iconCircle,
                            { backgroundColor: variant === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(128, 242, 13, 0.1)' }
                        ]}>
                            <AlertCircle
                                size={24}
                                color={variant === 'danger' ? '#EF4444' : NEON_LIME}
                            />
                        </View>
                        <Pressable onPress={onCancel} style={styles.closeBtn}>
                            <X size={20} color="rgba(255,255,255,0.3)" />
                        </Pressable>
                    </View>

                    <View style={styles.content}>
                        <Text style={[styles.title, { color: palette.text }]}>{title.toUpperCase()}</Text>
                        <Text style={[styles.message, { color: palette.mutedText }]}>{message}</Text>
                    </View>

                    <View style={styles.footer}>
                        {showCancel && (
                            <Pressable
                                onPress={onCancel}
                                style={styles.cancelBtn}
                            >
                                <Text style={styles.cancelBtnText}>{cancelLabel.toUpperCase()}</Text>
                            </Pressable>
                        )}

                        <Pressable
                            onPress={onConfirm}
                            style={[
                                styles.confirmBtn,
                                {
                                    backgroundColor: variant === 'danger' ? '#EF4444' : NEON_LIME,
                                    flex: showCancel ? 1.5 : 1
                                }
                            ]}
                        >
                            <Text style={[
                                styles.confirmBtnText,
                                { color: variant === 'danger' ? '#fff' : '#000' }
                            ]}>{confirmLabel.toUpperCase()}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const getStyles = (palette: any) => StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.85)',
    },
    panel: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: palette.card,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: palette.border,
        padding: 24,
        gap: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.5,
                shadowRadius: 20,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    content: {
        gap: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    message: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 4,
    },
    cancelBtn: {
        flex: 1,
        height: 52,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: palette.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtnText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1,
    },
    confirmBtn: {
        flex: 1.5,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmBtnText: {
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 1,
    },
});
