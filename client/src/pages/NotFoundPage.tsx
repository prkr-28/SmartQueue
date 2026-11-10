import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-navy-50 dark:bg-navy-950 text-center">
      <div>
        <h1 className="text-7xl font-extrabold text-medical-600 dark:text-medical-400">404</h1>
        <h2 className="text-2xl font-bold text-navy-900 dark:text-white mt-4">Page Not Found</h2>
        <p className="text-sm text-navy-500 dark:text-navy-400 mt-2 max-w-sm mx-auto">
          The healthcare page or service you are trying to access does not exist or has been moved.
        </p>
        <div className="mt-6">
          <Link to="/">
            <Button variant="primary" leftIcon={<Home className="w-4 h-4" />}>
              Return to Homepage
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
