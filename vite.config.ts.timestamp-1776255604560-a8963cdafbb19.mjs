// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [react()],
  build: {
    // Output directory
    outDir: "dist",
    // Generate sourcemaps for production debugging
    sourcemap: false,
    // Optimize chunk size
    chunkSizeWarningLimit: 1e3,
    // Rollup options
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // React core
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          // UI libraries
          "ui-vendor": ["framer-motion", "lucide-react"],
          // Heavy libraries
          "pdf-vendor": ["jspdf", "html2canvas"],
          // Supabase and data
          "data-vendor": ["@supabase/supabase-js", "@tanstack/react-query"],
          // Image processing
          "image-vendor": ["react-easy-crop"]
        },
        // Asset file naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split(".");
          const ext = info?.[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || "")) {
            return `assets/images/[name]-[hash][extname]`;
          } else if (/woff|woff2|eot|ttf|otf/i.test(ext || "")) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js"
      }
    },
    // Minification
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.log", "console.info", "console.debug"]
      }
    },
    // Target modern browsers
    target: "es2020",
    // CSS code splitting
    cssCodeSplit: true,
    // Report compressed size
    reportCompressedSize: true
  },
  // Optimizations
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@supabase/supabase-js",
      "@tanstack/react-query"
    ]
  },
  // Server configuration
  server: {
    port: 3e3,
    strictPort: false,
    host: true
  },
  // Preview configuration
  preview: {
    port: 3e3,
    strictPort: false,
    host: true
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgYnVpbGQ6IHtcbiAgICAvLyBPdXRwdXQgZGlyZWN0b3J5XG4gICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgLy8gR2VuZXJhdGUgc291cmNlbWFwcyBmb3IgcHJvZHVjdGlvbiBkZWJ1Z2dpbmdcbiAgICBzb3VyY2VtYXA6IGZhbHNlLFxuICAgIC8vIE9wdGltaXplIGNodW5rIHNpemVcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDEwMDAsXG4gICAgLy8gUm9sbHVwIG9wdGlvbnNcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgLy8gTWFudWFsIGNodW5rIHNwbGl0dGluZyBmb3IgYmV0dGVyIGNhY2hpbmdcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgLy8gUmVhY3QgY29yZVxuICAgICAgICAgICdyZWFjdC12ZW5kb3InOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdyZWFjdC1yb3V0ZXItZG9tJ10sXG4gICAgICAgICAgLy8gVUkgbGlicmFyaWVzXG4gICAgICAgICAgJ3VpLXZlbmRvcic6IFsnZnJhbWVyLW1vdGlvbicsICdsdWNpZGUtcmVhY3QnXSxcbiAgICAgICAgICAvLyBIZWF2eSBsaWJyYXJpZXNcbiAgICAgICAgICAncGRmLXZlbmRvcic6IFsnanNwZGYnLCAnaHRtbDJjYW52YXMnXSxcbiAgICAgICAgICAvLyBTdXBhYmFzZSBhbmQgZGF0YVxuICAgICAgICAgICdkYXRhLXZlbmRvcic6IFsnQHN1cGFiYXNlL3N1cGFiYXNlLWpzJywgJ0B0YW5zdGFjay9yZWFjdC1xdWVyeSddLFxuICAgICAgICAgIC8vIEltYWdlIHByb2Nlc3NpbmdcbiAgICAgICAgICAnaW1hZ2UtdmVuZG9yJzogWydyZWFjdC1lYXN5LWNyb3AnXSxcbiAgICAgICAgfSxcbiAgICAgICAgLy8gQXNzZXQgZmlsZSBuYW1pbmdcbiAgICAgICAgYXNzZXRGaWxlTmFtZXM6IChhc3NldEluZm8pID0+IHtcbiAgICAgICAgICBjb25zdCBpbmZvID0gYXNzZXRJbmZvLm5hbWU/LnNwbGl0KCcuJyk7XG4gICAgICAgICAgY29uc3QgZXh0ID0gaW5mbz8uW2luZm8ubGVuZ3RoIC0gMV07XG4gICAgICAgICAgaWYgKC9wbmd8anBlP2d8c3ZnfGdpZnx0aWZmfGJtcHxpY28vaS50ZXN0KGV4dCB8fCAnJykpIHtcbiAgICAgICAgICAgIHJldHVybiBgYXNzZXRzL2ltYWdlcy9bbmFtZV0tW2hhc2hdW2V4dG5hbWVdYDtcbiAgICAgICAgICB9IGVsc2UgaWYgKC93b2ZmfHdvZmYyfGVvdHx0dGZ8b3RmL2kudGVzdChleHQgfHwgJycpKSB7XG4gICAgICAgICAgICByZXR1cm4gYGFzc2V0cy9mb250cy9bbmFtZV0tW2hhc2hdW2V4dG5hbWVdYDtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGBhc3NldHMvW25hbWVdLVtoYXNoXVtleHRuYW1lXWA7XG4gICAgICAgIH0sXG4gICAgICAgIGNodW5rRmlsZU5hbWVzOiAnYXNzZXRzL2pzL1tuYW1lXS1baGFzaF0uanMnLFxuICAgICAgICBlbnRyeUZpbGVOYW1lczogJ2Fzc2V0cy9qcy9bbmFtZV0tW2hhc2hdLmpzJyxcbiAgICAgIH0sXG4gICAgfSxcbiAgICAvLyBNaW5pZmljYXRpb25cbiAgICBtaW5pZnk6ICd0ZXJzZXInLFxuICAgIHRlcnNlck9wdGlvbnM6IHtcbiAgICAgIGNvbXByZXNzOiB7XG4gICAgICAgIGRyb3BfY29uc29sZTogdHJ1ZSxcbiAgICAgICAgZHJvcF9kZWJ1Z2dlcjogdHJ1ZSxcbiAgICAgICAgcHVyZV9mdW5jczogWydjb25zb2xlLmxvZycsICdjb25zb2xlLmluZm8nLCAnY29uc29sZS5kZWJ1ZyddLFxuICAgICAgfSxcbiAgICB9LFxuICAgIC8vIFRhcmdldCBtb2Rlcm4gYnJvd3NlcnNcbiAgICB0YXJnZXQ6ICdlczIwMjAnLFxuICAgIC8vIENTUyBjb2RlIHNwbGl0dGluZ1xuICAgIGNzc0NvZGVTcGxpdDogdHJ1ZSxcbiAgICAvLyBSZXBvcnQgY29tcHJlc3NlZCBzaXplXG4gICAgcmVwb3J0Q29tcHJlc3NlZFNpemU6IHRydWUsXG4gIH0sXG4gIC8vIE9wdGltaXphdGlvbnNcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgaW5jbHVkZTogW1xuICAgICAgJ3JlYWN0JyxcbiAgICAgICdyZWFjdC1kb20nLFxuICAgICAgJ3JlYWN0LXJvdXRlci1kb20nLFxuICAgICAgJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcycsXG4gICAgICAnQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5JyxcbiAgICBdLFxuICB9LFxuICAvLyBTZXJ2ZXIgY29uZmlndXJhdGlvblxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiAzMDAwLFxuICAgIHN0cmljdFBvcnQ6IGZhbHNlLFxuICAgIGhvc3Q6IHRydWUsXG4gIH0sXG4gIC8vIFByZXZpZXcgY29uZmlndXJhdGlvblxuICBwcmV2aWV3OiB7XG4gICAgcG9ydDogMzAwMCxcbiAgICBzdHJpY3RQb3J0OiBmYWxzZSxcbiAgICBob3N0OiB0cnVlLFxuICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXlOLFNBQVMsb0JBQW9CO0FBQ3RQLE9BQU8sV0FBVztBQUVsQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsT0FBTztBQUFBO0FBQUEsSUFFTCxRQUFRO0FBQUE7QUFBQSxJQUVSLFdBQVc7QUFBQTtBQUFBLElBRVgsdUJBQXVCO0FBQUE7QUFBQSxJQUV2QixlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUE7QUFBQSxRQUVOLGNBQWM7QUFBQTtBQUFBLFVBRVosZ0JBQWdCLENBQUMsU0FBUyxhQUFhLGtCQUFrQjtBQUFBO0FBQUEsVUFFekQsYUFBYSxDQUFDLGlCQUFpQixjQUFjO0FBQUE7QUFBQSxVQUU3QyxjQUFjLENBQUMsU0FBUyxhQUFhO0FBQUE7QUFBQSxVQUVyQyxlQUFlLENBQUMseUJBQXlCLHVCQUF1QjtBQUFBO0FBQUEsVUFFaEUsZ0JBQWdCLENBQUMsaUJBQWlCO0FBQUEsUUFDcEM7QUFBQTtBQUFBLFFBRUEsZ0JBQWdCLENBQUMsY0FBYztBQUM3QixnQkFBTSxPQUFPLFVBQVUsTUFBTSxNQUFNLEdBQUc7QUFDdEMsZ0JBQU0sTUFBTSxPQUFPLEtBQUssU0FBUyxDQUFDO0FBQ2xDLGNBQUksa0NBQWtDLEtBQUssT0FBTyxFQUFFLEdBQUc7QUFDckQsbUJBQU87QUFBQSxVQUNULFdBQVcsMEJBQTBCLEtBQUssT0FBTyxFQUFFLEdBQUc7QUFDcEQsbUJBQU87QUFBQSxVQUNUO0FBQ0EsaUJBQU87QUFBQSxRQUNUO0FBQUEsUUFDQSxnQkFBZ0I7QUFBQSxRQUNoQixnQkFBZ0I7QUFBQSxNQUNsQjtBQUFBLElBQ0Y7QUFBQTtBQUFBLElBRUEsUUFBUTtBQUFBLElBQ1IsZUFBZTtBQUFBLE1BQ2IsVUFBVTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsZUFBZTtBQUFBLFFBQ2YsWUFBWSxDQUFDLGVBQWUsZ0JBQWdCLGVBQWU7QUFBQSxNQUM3RDtBQUFBLElBQ0Y7QUFBQTtBQUFBLElBRUEsUUFBUTtBQUFBO0FBQUEsSUFFUixjQUFjO0FBQUE7QUFBQSxJQUVkLHNCQUFzQjtBQUFBLEVBQ3hCO0FBQUE7QUFBQSxFQUVBLGNBQWM7QUFBQSxJQUNaLFNBQVM7QUFBQSxNQUNQO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUE7QUFBQSxFQUVBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQSxJQUNaLE1BQU07QUFBQSxFQUNSO0FBQUE7QUFBQSxFQUVBLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQSxJQUNaLE1BQU07QUFBQSxFQUNSO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
