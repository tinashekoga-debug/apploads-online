// ===========================================
// Offline Queue Manager
// ===========================================
// Handles queuing posts when offline and syncing when back online
// ===========================================

const OFFLINE_QUEUE_KEY = 'apploads-offline-queue';
const SYNC_QUEUE_KEY = 'apploads-sync-queue';

export class OfflineQueue {
  // Add post to offline queue
  static async queuePost(type, data) {
    const queue = await this.getQueue();
    const post = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      type,
      data,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    queue.push(post);
    await this.saveQueue(queue);
    
    // Request background sync if available
    if ('serviceWorker' in navigator && 'sync' in registration) {
      const registration = await navigator.serviceWorker.ready;
      registration.sync.register('pending-posts');
    }
    
    return post.id;
  }
  
  // Get all queued posts
  static async getQueue() {
    try {
      const queue = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Error reading offline queue:', error);
      return [];
    }
  }
  
  // Save queue to localStorage
  static async saveQueue(queue) {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  }
  
  // Process queued posts when back online
  static async processQueue() {
    if (!navigator.onLine) return;
    
    const queue = await this.getQueue();
    const pendingPosts = queue.filter(post => post.status === 'pending');
    
    for (const post of pendingPosts) {
      try {
        await this.syncPost(post);
        post.status = 'synced';
        post.syncedAt = Date.now();
      } catch (error) {
        console.error(`Failed to sync post ${post.id}:`, error);
        post.status = 'failed';
        post.error = error.message;
      }
    }
    
    await this.saveQueue(queue);
    
    // Remove synced posts after successful sync
    await this.cleanupQueue();
  }
  
  // Sync individual post (implementation depends on your API)
  static async syncPost(post) {
    // TODO: Implement based on your Firestore sync logic
    console.log(`Syncing ${post.type} post:`, post);
    
    // Example implementation:
    // if (post.type === 'load') {
    //   await postLoadOffline(post.data);
    // } else if (post.type === 'sale') {
    //   await postSaleOffline(post.data);
    // }
  }
  
  // Remove synced posts from queue
  static async cleanupQueue() {
    const queue = await this.getQueue();
    const activeQueue = queue.filter(post => 
      post.status === 'pending' || post.status === 'failed'
    );
    await this.saveQueue(activeQueue);
  }
  
  // Get queue status
  static async getQueueStatus() {
    const queue = await this.getQueue();
    const pending = queue.filter(post => post.status === 'pending').length;
    const failed = queue.filter(post => post.status === 'failed').length;
    
    return {
      total: queue.length,
      pending,
      failed,
      hasPending: pending > 0
    };
  }
}

// Listen for online/offline events
window.addEventListener('online', () => {
  console.log('🌐 App is back online - processing queue...');
  OfflineQueue.processQueue();
});

window.addEventListener('offline', () => {
  console.log('📵 App is offline - queuing posts...');
});