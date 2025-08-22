// Performance optimization utilities

// Debounce function to limit how often a function can be called
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

// Throttle function to limit function execution frequency
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

// Memory management utility
export class MemoryManager {
    private static instance: MemoryManager;
    private cleanupTasks: (() => void)[] = [];

    static getInstance(): MemoryManager {
        if (!MemoryManager.instance) {
            MemoryManager.instance = new MemoryManager();
        }
        return MemoryManager.instance;
    }

    addCleanupTask(task: () => void): void {
        this.cleanupTasks.push(task);
    }

    cleanup(): void {
        this.cleanupTasks.forEach(task => {
            try {
                task();
            } catch (error) {
                console.error('Cleanup task error:', error);
            }
        });
        this.cleanupTasks = [];
    }

    // Force garbage collection if available (mainly for debugging)
    forceGC(): void {
        if (global.gc) {
            global.gc();
        }
    }
}

// Image optimization utilities
export const imageOptimizer = {
    // Preload images to improve perceived performance
    preloadImages: (imageUrls: string[]): Promise<void[]> => {
        return Promise.all(
            imageUrls.map(url => {
                return new Promise<void>((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve();
                    img.onerror = () => reject();
                    img.src = url;
                });
            })
        );
    },

    // Lazy load images
    lazyLoadImage: (src: string, placeholder?: string): string => {
        // Return placeholder while image loads
        return placeholder || src;
    }
};

// Network optimization utilities
export const networkOptimizer = {
    // Retry mechanism with exponential backoff
    retryWithBackoff: async <T>(
        fn: () => Promise<T>,
        maxRetries: number = 3,
        baseDelay: number = 1000
    ): Promise<T> => {
        let lastError: Error;
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error as Error;
                if (i === maxRetries - 1) throw lastError;
                
                const delay = baseDelay * Math.pow(2, i);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw lastError!;
    },

    // Batch network requests
    batchRequests: <T>(
        requests: (() => Promise<T>)[],
        batchSize: number = 5
    ): Promise<T[]> => {
        const results: T[] = [];
        
        return new Promise((resolve, reject) => {
            let currentIndex = 0;
            
            const processBatch = async () => {
                const batch = requests.slice(currentIndex, currentIndex + batchSize);
                if (batch.length === 0) {
                    resolve(results);
                    return;
                }
                
                try {
                    const batchResults = await Promise.all(batch.map(req => req()));
                    results.push(...batchResults);
                    currentIndex += batchSize;
                    processBatch();
                } catch (error) {
                    reject(error);
                }
            };
            
            processBatch();
        });
    }
};

// Component optimization utilities
export const componentOptimizer = {
    // Memoize expensive calculations
    memoize: <T extends (...args: any[]) => any>(
        fn: T,
        getKey?: (...args: Parameters<T>) => string
    ): T => {
        const cache = new Map<string, ReturnType<T>>();
        
        return ((...args: Parameters<T>): ReturnType<T> => {
            const key = getKey ? getKey(...args) : JSON.stringify(args);
            
            if (cache.has(key)) {
                return cache.get(key)!;
            }
            
            const result = fn(...args);
            cache.set(key, result);
            return result;
        }) as T;
    },

    // Prevent rapid re-renders
    preventRapidRenders: <T extends (...args: any[]) => any>(
        fn: T,
        delay: number = 100
    ): T => {
        let timeoutId: NodeJS.Timeout;
        let lastCallTime = 0;
        
        return ((...args: Parameters<T>): void => {
            const now = Date.now();
            
            if (now - lastCallTime < delay) {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    fn(...args);
                    lastCallTime = Date.now();
                }, delay);
            } else {
                fn(...args);
                lastCallTime = now;
            }
        }) as T;
    }
};

// Export default instance
export const memoryManager = MemoryManager.getInstance();
