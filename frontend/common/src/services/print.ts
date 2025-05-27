/**
 * Print service for handling printing operations
 */
export class PrintService {
  /**
   * Print an HTML element
   * @param element - HTML element to print
   * @param options - Print options
   */
  static printElement(element: HTMLElement, options: PrintOptions = {}): void {
    const { title = 'Print', hideAfterPrint = true } = options;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'height=600,width=800');
    
    if (!printWindow) {
      console.error('Failed to open print window. Check if pop-ups are blocked.');
      return;
    }
    
    // Set up the print window
    printWindow.document.write('<html><head><title>' + title + '</title>');
    
    // Add styles
    printWindow.document.write('<style>');
    printWindow.document.write('body { font-family: Arial, sans-serif; }');
    printWindow.document.write('table { border-collapse: collapse; width: 100%; }');
    printWindow.document.write('th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }');
    printWindow.document.write('th { background-color: #f2f2f2; }');
    printWindow.document.write('</style>');
    
    // Add any custom styles
    if (options.styles) {
      printWindow.document.write('<style>' + options.styles + '</style>');
    }
    
    printWindow.document.write('</head><body>');
    
    // Add the content
    printWindow.document.write(element.outerHTML);
    
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    
    // Wait for resources to load
    printWindow.onload = function() {
      // Print the window
      printWindow.print();
      
      // Close the window after printing if specified
      if (hideAfterPrint) {
        printWindow.onafterprint = function() {
          printWindow.close();
        };
      }
    };
  }

  /**
   * Print a receipt
   * @param receiptData - Receipt data
   * @param options - Print options
   */
  static printReceipt(receiptData: ReceiptData, options: PrintOptions = {}): void {
    // Create a receipt element
    const receiptElement = document.createElement('div');
    receiptElement.className = 'receipt';
    
    // Add header
    const header = document.createElement('div');
    header.className = 'receipt-header';
    header.innerHTML = `
      <h2>${receiptData.businessName}</h2>
      <p>${receiptData.businessAddress}</p>
      <p>CNPJ: ${receiptData.businessCnpj}</p>
      <p>Data: ${receiptData.date}</p>
      <p>Hora: ${receiptData.time}</p>
      <p>Pedido: ${receiptData.orderNumber}</p>
      ${receiptData.customerName ? `<p>Cliente: ${receiptData.customerName}</p>` : ''}
    `;
    receiptElement.appendChild(header);
    
    // Add items
    const itemsTable = document.createElement('table');
    itemsTable.className = 'receipt-items';
    itemsTable.innerHTML = `
      <thead>
        <tr>
          <th>Item</th>
          <th>Qtd</th>
          <th>Valor</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${receiptData.items.map(item => `
          <tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>R$ ${item.price.toFixed(2)}</td>
            <td>R$ ${(item.quantity * item.price).toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    `;
    receiptElement.appendChild(itemsTable);
    
    // Add totals
    const totals = document.createElement('div');
    totals.className = 'receipt-totals';
    totals.innerHTML = `
      <p>Subtotal: R$ ${receiptData.subtotal.toFixed(2)}</p>
      ${receiptData.discount ? `<p>Desconto: R$ ${receiptData.discount.toFixed(2)}</p>` : ''}
      ${receiptData.tax ? `<p>Impostos: R$ ${receiptData.tax.toFixed(2)}</p>` : ''}
      <p><strong>Total: R$ ${receiptData.total.toFixed(2)}</strong></p>
    `;
    receiptElement.appendChild(totals);
    
    // Add payment info
    const paymentInfo = document.createElement('div');
    paymentInfo.className = 'receipt-payment';
    paymentInfo.innerHTML = `
      <p>Forma de Pagamento: ${receiptData.paymentMethod}</p>
      ${receiptData.paymentDetails ? `<p>${receiptData.paymentDetails}</p>` : ''}
    `;
    receiptElement.appendChild(paymentInfo);
    
    // Add footer
    const footer = document.createElement('div');
    footer.className = 'receipt-footer';
    footer.innerHTML = `
      <p>${receiptData.footerText || 'Obrigado pela preferência!'}</p>
    `;
    receiptElement.appendChild(footer);
    
    // Print the receipt
    this.printElement(receiptElement, {
      title: 'Recibo - ' + receiptData.orderNumber,
      styles: `
        .receipt { font-family: 'Courier New', monospace; width: 300px; margin: 0 auto; }
        .receipt-header { text-align: center; margin-bottom: 10px; }
        .receipt-header h2 { margin: 5px 0; }
        .receipt-header p { margin: 2px 0; }
        .receipt-items { width: 100%; margin: 10px 0; }
        .receipt-totals { text-align: right; margin: 10px 0; }
        .receipt-payment { margin: 10px 0; }
        .receipt-footer { text-align: center; margin-top: 20px; border-top: 1px dashed #000; padding-top: 10px; }
      `,
      ...options
    });
  }

  /**
   * Print an order ticket for the kitchen
   * @param orderData - Order data
   * @param options - Print options
   */
  static printKitchenTicket(orderData: KitchenTicketData, options: PrintOptions = {}): void {
    // Create a ticket element
    const ticketElement = document.createElement('div');
    ticketElement.className = 'kitchen-ticket';
    
    // Add header
    const header = document.createElement('div');
    header.className = 'ticket-header';
    header.innerHTML = `
      <h2>PEDIDO #${orderData.orderNumber}</h2>
      <p>Data: ${orderData.date} - Hora: ${orderData.time}</p>
      ${orderData.table ? `<p>Mesa: ${orderData.table}</p>` : ''}
      ${orderData.customerName ? `<p>Cliente: ${orderData.customerName}</p>` : ''}
      ${orderData.type ? `<p>Tipo: ${orderData.type}</p>` : ''}
    `;
    ticketElement.appendChild(header);
    
    // Add items
    const itemsList = document.createElement('div');
    itemsList.className = 'ticket-items';
    
    orderData.items.forEach(item => {
      const itemElement = document.createElement('div');
      itemElement.className = 'ticket-item';
      itemElement.innerHTML = `
        <h3>${item.quantity}x ${item.name}</h3>
        ${item.notes ? `<p>Obs: ${item.notes}</p>` : ''}
        ${item.modifiers && item.modifiers.length > 0 ? `
          <ul>
            ${item.modifiers.map(mod => `<li>${mod.quantity}x ${mod.name}</li>`).join('')}
          </ul>
        ` : ''}
      `;
      itemsList.appendChild(itemElement);
    });
    
    ticketElement.appendChild(itemsList);
    
    // Add notes
    if (orderData.notes) {
      const notes = document.createElement('div');
      notes.className = 'ticket-notes';
      notes.innerHTML = `<p><strong>Observações:</strong> ${orderData.notes}</p>`;
      ticketElement.appendChild(notes);
    }
    
    // Print the ticket
    this.printElement(ticketElement, {
      title: 'Comanda - ' + orderData.orderNumber,
      styles: `
        .kitchen-ticket { font-family: Arial, sans-serif; width: 300px; margin: 0 auto; }
        .ticket-header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .ticket-header h2 { margin: 5px 0; font-size: 24px; }
        .ticket-header p { margin: 2px 0; font-size: 14px; }
        .ticket-items { margin: 10px 0; }
        .ticket-item { margin-bottom: 15px; border-bottom: 1px dashed #ccc; padding-bottom: 10px; }
        .ticket-item h3 { margin: 5px 0; font-size: 18px; }
        .ticket-item p { margin: 5px 0; font-style: italic; }
        .ticket-item ul { margin: 5px 0; padding-left: 20px; }
        .ticket-notes { margin-top: 15px; border-top: 1px solid #000; padding-top: 10px; }
      `,
      ...options
    });
  }
}

interface PrintOptions {
  title?: string;
  styles?: string;
  hideAfterPrint?: boolean;
}

interface ReceiptData {
  businessName: string;
  businessAddress: string;
  businessCnpj: string;
  date: string;
  time: string;
  orderNumber: string;
  customerName?: string;
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  paymentMethod: string;
  paymentDetails?: string;
  footerText?: string;
}

interface KitchenTicketData {
  orderNumber: string;
  date: string;
  time: string;
  table?: string;
  customerName?: string;
  type?: 'Delivery' | 'Takeout' | 'Dine-in';
  items: {
    name: string;
    quantity: number;
    notes?: string;
    modifiers?: {
      name: string;
      quantity: number;
    }[];
  }[];
  notes?: string;
}
