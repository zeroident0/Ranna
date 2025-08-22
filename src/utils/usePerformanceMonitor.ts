import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
    renderTime: number;
    memoryUsage?: number;
    timestamp: number;
}

interface UsePerformanceMonitorOptions {
    componentName: string;
    enabled?: boolean;
    onMetrics?: (metrics: PerformanceMetrics) => void;
    threshold?: number; // Alert if render time exceeds this threshold (ms)
}

export function usePerformanceMonitor({
    componentName,
    enabled = __DEV__, // Only enable in development
    onMetrics,
    threshold = 16 // 16ms = 60fps
}: UsePerformanceMonitorOptions) {
    const renderStartTime = useRef<number>(0);
    const renderCount = useRef<number>(0);

    const measureRender = useCallback(() => {
        if (!enabled) return;

        const renderEndTime = performance.now();
        const renderTime = renderEndTime - renderStartTime.current;
        
        renderCount.current++;

        const metrics: PerformanceMetrics = {
            renderTime,
            timestamp: Date.now(),
        };

        // Try to get memory usage if available
        if (global.performance && (global.performance as any).memory) {
            const memory = (global.performance as any).memory;
            metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
        }

        // Log performance issues
        if (renderTime > threshold) {
            console.warn(
                `🚨 Performance issue detected in ${componentName}:`,
                `Render took ${renderTime.toFixed(2)}ms (threshold: ${threshold}ms)`
            );
        }

        // Call custom metrics handler
        if (onMetrics) {
            onMetrics(metrics);
        }

        // Log in development
        if (__DEV__ && renderCount.current % 10 === 0) { // Log every 10th render
            console.log(
                `📊 ${componentName} performance:`,
                `Render #${renderCount.current},`,
                `Time: ${renderTime.toFixed(2)}ms`
            );
        }
    }, [componentName, enabled, onMetrics, threshold]);

    useEffect(() => {
        renderStartTime.current = performance.now();
        
        // Use requestAnimationFrame to measure after render
        const rafId = requestAnimationFrame(measureRender);
        
        return () => cancelAnimationFrame(rafId);
    });

    return {
        renderCount: renderCount.current,
        measureRender,
    };
}

// Hook for measuring specific operations
export function useOperationTimer(operationName: string) {
    const startTime = useRef<number>(0);

    const startTimer = useCallback(() => {
        startTime.current = performance.now();
    }, []);

    const endTimer = useCallback(() => {
        const endTime = performance.now();
        const duration = endTime - startTime.current;
        
        if (__DEV__) {
            console.log(`⏱️ ${operationName} took ${duration.toFixed(2)}ms`);
        }
        
        return duration;
    }, [operationName]);

    return { startTimer, endTimer };
}

// Hook for measuring network requests
export function useNetworkTimer() {
    const timers = useRef<Map<string, number>>(new Map());

    const startNetworkTimer = useCallback((requestId: string) => {
        timers.current.set(requestId, performance.now());
    }, []);

    const endNetworkTimer = useCallback((requestId: string) => {
        const startTime = timers.current.get(requestId);
        if (startTime) {
            const duration = performance.now() - startTime;
            timers.current.delete(requestId);
            
            if (__DEV__) {
                console.log(`🌐 Network request ${requestId} took ${duration.toFixed(2)}ms`);
            }
            
            return duration;
        }
        return 0;
    }, []);

    return { startNetworkTimer, endNetworkTimer };
}

// Hook for memory monitoring
export function useMemoryMonitor(componentName: string) {
    const memoryRef = useRef<number>(0);

    const checkMemory = useCallback(() => {
        if (global.performance && (global.performance as any).memory) {
            const memory = (global.performance as any).memory;
            const currentMemory = memory.usedJSHeapSize / 1024 / 1024; // MB
            const memoryIncrease = currentMemory - memoryRef.current;
            
            if (__DEV__ && Math.abs(memoryIncrease) > 1) { // Log if memory changed by more than 1MB
                console.log(
                    `🧠 ${componentName} memory:`,
                    `${currentMemory.toFixed(2)}MB`,
                    memoryIncrease > 0 ? `(+${memoryIncrease.toFixed(2)}MB)` : `(${memoryIncrease.toFixed(2)}MB)`
                );
            }
            
            memoryRef.current = currentMemory;
            return currentMemory;
        }
        return 0;
    }, [componentName]);

    useEffect(() => {
        checkMemory();
    });

    return { checkMemory, currentMemory: memoryRef.current };
}

// Performance monitoring utilities
export const performanceUtils = {
    // Measure function execution time
    measureExecution: <T extends (...args: any[]) => any>(
        fn: T,
        name: string
    ): T => {
        return ((...args: Parameters<T>): ReturnType<T> => {
            const startTime = performance.now();
            const result = fn(...args);
            const endTime = performance.now();
            
            if (__DEV__) {
                console.log(`⚡ ${name} execution: ${(endTime - startTime).toFixed(2)}ms`);
            }
            
            return result;
        }) as T;
    },

    // Measure async function execution time
    measureAsyncExecution: <T extends (...args: any[]) => Promise<any>>(
        fn: T,
        name: string
    ): T => {
        return (async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
            const startTime = performance.now();
            const result = await fn(...args);
            const endTime = performance.now();
            
            if (__DEV__) {
                console.log(`⚡ ${name} async execution: ${(endTime - startTime).toFixed(2)}ms`);
            }
            
            return result;
        }) as T;
    },

    // Get current memory usage
    getMemoryUsage: (): { used: number; total: number; limit: number } | null => {
        if (global.performance && (global.performance as any).memory) {
            const memory = (global.performance as any).memory;
            return {
                used: memory.usedJSHeapSize / 1024 / 1024, // MB
                total: memory.totalJSHeapSize / 1024 / 1024, // MB
                limit: memory.jsHeapSizeLimit / 1024 / 1024, // MB
            };
        }
        return null;
    },

    // Check if performance is acceptable
    isPerformanceAcceptable: (renderTime: number, threshold: number = 16): boolean => {
        return renderTime <= threshold;
    }
};
