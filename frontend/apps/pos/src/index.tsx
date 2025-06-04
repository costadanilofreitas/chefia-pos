import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { OrderProvider } from '@common/contexts/order/hooks/useOrder';
import { ProductProvider } from '@common/contexts/product/hooks/useProduct';
import { CashierProvider } from '@common/contexts/cashier/hooks/useCashier';
import POSMainPage from './ui/POSMainPage';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <CashierProvider>
        <ProductProvider>
          <OrderProvider>
            <POSMainPage />
          </OrderProvider>
        </ProductProvider>
      </CashierProvider>
    </BrowserRouter>
  </React.StrictMode>
);
