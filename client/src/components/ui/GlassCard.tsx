import { type ReactNode, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type GlassIntensity = 'subtle' | 'moderate' | 'strong';
type GlassVariant = 'default' | 'gradient-border' | 'glow';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    intensity?: GlassIntensity;
    variant?: GlassVariant;
    hover?: boolean;
    className?: string;
}

/**
 * UI Pro Max Glassmorphic Card Component
 * 
 * A premium, reusable glass card with configurable blur intensity,
 * gradient borders, and smooth animations.
 * 
 * @example
 * ```tsx
 * <GlassCard intensity="moderate" variant="gradient-border" hover>
 *   <h2>Territory Information</h2>
 *   <p>Details about the selected territory...</p>
 * </GlassCard>
 * ```
 */
export function GlassCard({
    children,
    intensity = 'moderate',
    variant = 'default',
    hover = true,
    className,
    ...props
}: GlassCardProps) {
    return (
        <div
            className={cn(
                // Base glass effect based on intensity
                intensity === 'subtle' && 'glass-subtle',
                intensity === 'moderate' && 'glass-moderate',
                intensity === 'strong' && 'glass-strong',

                // Variant styles
                variant === 'gradient-border' && 'glass-gradient-border',
                variant === 'glow' && 'shadow-glow-gold',

                // Standard card styling
                'rounded-2xl p-6',

                // Transition and hover effects
                'transition-all duration-300',
                hover && 'hover:-translate-y-1 hover:shadow-2xl cursor-pointer',

                // Active state
                'active:scale-[0.99]',

                // Custom scrollbar for content
                'custom-scrollbar',

                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

/**
 * UI Pro Max Glass Panel (for larger content areas)
 * 
 * Similar to GlassCard but optimized for panels and larger sections.
 */
interface GlassPanelProps extends GlassCardProps {
    fullHeight?: boolean;
}

export function GlassPanel({
    children,
    fullHeight = false,
    className,
    ...props
}: GlassPanelProps) {
    return (
        <GlassCard
            className={cn(
                'max-w-none',
                fullHeight && 'h-full',
                className
            )}
            {...props}
        >
            {children}
        </GlassCard>
    );
}

/**
 * UI Pro Max Glass Button
 * 
 * A glassmorphic button with premium hover and active states.
 */
interface GlassButtonProps extends HTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: 'default' | 'primary' | 'accent';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function GlassButton({
    children,
    variant = 'default',
    size = 'md',
    className,
    ...props
}: GlassButtonProps) {
    return (
        <button
            className={cn(
                // Base glass effect
                'glass-moderate',

                // Size variants
                size === 'sm' && 'px-3 py-1.5 text-sm',
                size === 'md' && 'px-4 py-2.5 text-base',
                size === 'lg' && 'px-6 py-3 text-lg',

                // Border radius
                'rounded-xl',

                // Interactions
                'transition-all duration-200',
                'hover:scale-105 hover-glow',
                'active:scale-95',
                'focus-ring-gold',

                // Variant colors
                variant === 'primary' && 'bg-earth-brown/20 text-earth-brown font-semibold',
                variant === 'accent' && 'bg-earth-gold/20 text-earth-gold font-semibold',
                variant === 'default' && 'text-foreground',

                // Cursor
                'cursor-pointer',

                className
            )}
            {...props}
        >
            {children}
        </button>
    );
}
