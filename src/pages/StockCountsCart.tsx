import { useMemo, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Package as PackageIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ThemeToggle from '@/components/theme-toggle';

interface CartItem {
  id: string;
  inventoryItemId: string;
  deviceType: string;
  itemDescription: string;
  itemCategory: string;
  itemNature: string;
  quantity: number;
  itemCode: string;
  itemUrl?: string;
}

interface StockCountFormData {
  countType: 'Monthly' | 'Quarterly' | 'Ad-hoc';
  stockHolder: string;
  region: string;
  countDate: string;
}

interface ScannedItemData {
  cartItemId: string;
  deviceType: string;
  itemCategory: string;
  itemNature: string;
  // Serial numbers
  manufactureSerialNumber?: string;
  qrCodeSerialNumber?: string;
  xlinkSerialNumber?: string;
  cradleSerialNumber?: string;
  chargerSerialNumber?: string;
  // Status fields
  itemStatus: 'Functional' | 'Faulty' | '';
  faultReason?: string;
  overallCondition: 'New' | 'Good' | 'Fair' | 'Poor' | '';
  // For Cash Connect QR parsing
  scannedItemCode?: string;
}

const StockCountsCart = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Get data from navigation state
  const {
    cart = [],
    formData,
    userEmail,
  } = location.state as { cart: CartItem[]; formData: StockCountFormData; userEmail?: string } || {};

  const [scannedItems, setScannedItems] = useState<ScannedItemData[]>([]);
  const [selectedCartItem, setSelectedCartItem] = useState<CartItem | null>(null);
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Form state for scanning dialog
  const [scanFormData, setScanFormData] = useState<Partial<ScannedItemData>>({
    itemStatus: '',
    overallCondition: '',
  });

  // Cash Connect QR Code scanning state
  const [qrScanInput, setQrScanInput] = useState('');

  // Helper to check if item is Cash Connect
  const isCashConnect = (item: CartItem | null) =>
    item?.itemCategory?.includes('Cash Connect') ?? false;

  // Parse comma-separated QR code input for Cash Connect
  const parseQrCodeInput = (input: string) => {
    const commaCount = (input.match(/,/g) || []).length;

    if (commaCount >= 1) {
      const firstCommaIndex = input.indexOf(',');
      const itemCode = input.substring(0, firstCommaIndex).trim();

      let cashConnectSerial = '';
      if (commaCount > 1) {
        // More than 1 comma: extract characters 14-18 (positions 13-17 in 0-based index)
        cashConnectSerial = input.substring(13, 18);
      } else if (commaCount === 1) {
        // Exactly 1 comma: extract everything after the first comma
        cashConnectSerial = input.substring(firstCommaIndex + 1).trim();
      }

      return { itemCode, cashConnectSerial };
    }

    // No comma: use entire input as item code
    return { itemCode: input.trim(), cashConnectSerial: '' };
  };

  // Handle QR code scan input change for Cash Connect
  const handleQrScanChange = (value: string) => {
    setQrScanInput(value);

    if (value && isCashConnect(selectedCartItem)) {
      const { itemCode, cashConnectSerial } = parseQrCodeInput(value);
      setScanFormData(prev => ({
        ...prev,
        scannedItemCode: itemCode,
        qrCodeSerialNumber: cashConnectSerial,
      }));
    }
  };

  // Validate that scanned item matches cart item
  const validateItemMatch = (scannedItemCode: string | undefined, cartItem: CartItem): { isValid: boolean; message: string } => {
    if (!scannedItemCode || scannedItemCode.trim() === '') {
      // Allow empty item codes for manual entry
      return { isValid: true, message: '' };
    }

    const expectedCode = cartItem.itemCode?.trim().toUpperCase();
    const scannedCode = scannedItemCode.trim().toUpperCase();

    // If cart item has no item code, allow any scan
    if (!expectedCode) {
      return { isValid: true, message: '' };
    }

    // Strict match on item code
    if (scannedCode !== expectedCode) {
      return {
        isValid: false,
        message: `Wrong item scanned! Expected item code "${cartItem.itemCode}" but scanned "${scannedItemCode}". Please scan the correct item.`
      };
    }

    return { isValid: true, message: '' };
  };

  const totalQuantity = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const scannedQuantity = useMemo(() => {
    return scannedItems.length; // Each scan = 1 item
  }, [scannedItems]);

  const progressPercent = totalQuantity > 0 ? (scannedQuantity / totalQuantity) * 100 : 0;

  // Get scanned count for specific cart item
  const getScannedCountForItem = (cartItemId: string) => {
    return scannedItems.filter((item) => item.cartItemId === cartItemId).length;
  };

  const handleOpenScanDialog = (item: CartItem) => {
    setSelectedCartItem(item);
    setScanFormData({
      itemStatus: '',
      overallCondition: '',
    });
    setQrScanInput(''); // Reset QR scan input
    setShowScanDialog(true);
  };

  const handleAddScannedItem = () => {
    if (!selectedCartItem || !scanFormData.itemStatus || !scanFormData.overallCondition) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in Item Status and Overall Condition',
        variant: 'destructive',
      });
      return;
    }

    const isSerialised = selectedCartItem.itemNature?.toLowerCase().includes('serial');

    // Check for duplicate serial numbers
    if (isSerialised) {
      let duplicate: ScannedItemData | undefined;

      if (isCashConnect(selectedCartItem)) {
        // Cash Connect: Check QR Code Serial Number
        if (scanFormData.qrCodeSerialNumber) {
          duplicate = scannedItems.find(
            (item) =>
              item.qrCodeSerialNumber &&
              item.qrCodeSerialNumber.toUpperCase() === scanFormData.qrCodeSerialNumber!.toUpperCase()
          );
        }
      } else {
        // All other business lines: Check Manufacture, Xlink, Cradle, or Charger serial numbers
        duplicate = scannedItems.find((item) => {
          // Check Manufacture Serial Number
          if (
            scanFormData.manufactureSerialNumber &&
            item.manufactureSerialNumber &&
            item.manufactureSerialNumber.toUpperCase() === scanFormData.manufactureSerialNumber.toUpperCase()
          ) {
            return true;
          }
          // Check Xlink Serial Number
          if (
            scanFormData.xlinkSerialNumber &&
            item.xlinkSerialNumber &&
            item.xlinkSerialNumber.toUpperCase() === scanFormData.xlinkSerialNumber.toUpperCase()
          ) {
            return true;
          }
          // Check Cradle Serial Number
          if (
            scanFormData.cradleSerialNumber &&
            item.cradleSerialNumber &&
            item.cradleSerialNumber.toUpperCase() === scanFormData.cradleSerialNumber.toUpperCase()
          ) {
            return true;
          }
          // Check Charger Serial Number
          if (
            scanFormData.chargerSerialNumber &&
            item.chargerSerialNumber &&
            item.chargerSerialNumber.toUpperCase() === scanFormData.chargerSerialNumber.toUpperCase()
          ) {
            return true;
          }
          return false;
        });
      }

      if (duplicate) {
        toast({
          title: 'Duplicate serial number detected',
          description: 'This serial number has already been scanned',
          variant: 'destructive',
        });
        return;
      }
    }

    // Validate that scanned item matches cart item (for serialised items with item codes)
    if (isSerialised && scanFormData.scannedItemCode) {
      const itemMatchResult = validateItemMatch(scanFormData.scannedItemCode, selectedCartItem);
      if (!itemMatchResult.isValid) {
        toast({
          title: 'Wrong item scanned',
          description: itemMatchResult.message,
          variant: 'destructive',
        });
        return;
      }
    }

    // Check if we've already scanned enough items for this cart item
    const currentScannedCount = getScannedCountForItem(selectedCartItem.id);
    if (currentScannedCount >= selectedCartItem.quantity) {
      toast({
        title: 'Maximum quantity reached',
        description: `You have already scanned ${selectedCartItem.quantity} items for ${selectedCartItem.deviceType}`,
        variant: 'destructive',
      });
      return;
    }

    const newItem: ScannedItemData = {
      cartItemId: selectedCartItem.id,
      deviceType: selectedCartItem.deviceType,
      itemCategory: selectedCartItem.itemCategory,
      itemNature: selectedCartItem.itemNature,
      manufactureSerialNumber: scanFormData.manufactureSerialNumber,
      qrCodeSerialNumber: scanFormData.qrCodeSerialNumber,
      xlinkSerialNumber: scanFormData.xlinkSerialNumber,
      cradleSerialNumber: scanFormData.cradleSerialNumber,
      chargerSerialNumber: scanFormData.chargerSerialNumber,
      itemStatus: scanFormData.itemStatus!,
      faultReason: scanFormData.faultReason,
      overallCondition: scanFormData.overallCondition!,
      scannedItemCode: scanFormData.scannedItemCode,
    };

    setScannedItems([...scannedItems, newItem]);
    setShowScanDialog(false);
    setSelectedCartItem(null);

    toast({
      title: 'Item scanned',
      description: `${currentScannedCount + 1} of ${selectedCartItem.quantity} items scanned for ${selectedCartItem.deviceType}`,
    });
  };

  const handleRemoveScannedItem = (index: number) => {
    setScannedItems(scannedItems.filter((_, i) => i !== index));
  };

  const handleSubmitStockCount = async () => {
    if (scannedItems.length === 0) {
      toast({
        title: 'No items scanned',
        description: 'Please scan at least one item',
        variant: 'destructive',
      });
      return;
    }

    // Check if all cart items have been fully scanned
    const incompleteItems = cart.filter((cartItem) => {
      const scannedCount = getScannedCountForItem(cartItem.id);
      return scannedCount < cartItem.quantity;
    });

    if (incompleteItems.length > 0) {
      const itemsList = incompleteItems.map((item) => {
        const scannedCount = getScannedCountForItem(item.id);
        return `${item.deviceType} (${scannedCount}/${item.quantity})`;
      }).join(', ');

      toast({
        title: 'Incomplete scanning',
        description: `The following items need more scans: ${itemsList}. Continue anyway?`,
        variant: 'destructive',
      });
      // Optionally allow to continue or return here
      // For now, we'll allow submission with partial scans
    }

    setIsSubmitting(true);

    try {
      // Insert each scanned item as individual stock_counts record
      const stockCountsRecords = scannedItems.map((item) => ({
        count_type: formData.countType,
        stock_holder: formData.stockHolder,
        region: formData.region,
        count_date: formData.countDate,
        device_type: item.deviceType,
        quantity: 1, // Each scan is 1 item
        manufacture_serial_number: item.manufactureSerialNumber || null,
        qr_code_serial_number: item.qrCodeSerialNumber || null,
        xlink_serial_number: item.xlinkSerialNumber || null,
        cradle_serial_number: item.cradleSerialNumber || null,
        charger_serial_number: item.chargerSerialNumber || null,
        item_status: item.itemStatus,
        fault_reason: item.faultReason || null,
        overall_condition: item.overallCondition,
        counted_by: userEmail || 'Unknown',
        business_line: item.itemCategory,
        item_nature: item.itemNature,
      }));

      const { error } = await supabase
        .from('stock_counts')
        .insert(stockCountsRecords);

      if (error) {
        console.error('Error inserting stock counts:', error);
        toast({
          title: 'Submission failed',
          description: error.message,
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      setShowSuccessModal(true);
      setIsSubmitting(false);

      toast({
        title: 'Stock count submitted successfully',
        description: `${scannedItems.length} items have been recorded`,
      });
    } catch (error: any) {
      console.error('Error submitting stock count:', error);
      toast({
        title: 'Submission failed',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    navigate('/stock-counts');
  };

  // Redirect if no cart data
  if (!cart || cart.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link to="/stock-counts">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">Stock Counts Cart</h1>
            </div>
            <ThemeToggle />
          </div>

          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
              <h2 className="text-xl font-semibold mb-2">No Items in Cart</h2>
              <p className="text-muted-foreground mb-4">
                Please add items to your cart before proceeding to scan.
              </p>
              <Link to="/stock-counts">
                <Button>Go Back to Stock Counts</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/stock-counts">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Stock Counts Scanning</h1>
              <p className="text-sm text-muted-foreground">
                Scan serial numbers for each item
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Progress Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Scanning Progress</span>
              <span className="text-sm text-muted-foreground">
                {scannedQuantity} of {totalQuantity} items scanned
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </CardContent>
        </Card>

        {/* Cart Items List */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Cart Items to Scan */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Items to Scan</h2>
            <div className="space-y-3">
              {cart.map((item) => {
                const scannedCount = getScannedCountForItem(item.id);
                const isComplete = scannedCount >= item.quantity;

                return (
                  <Card key={item.id} className={isComplete ? 'border-green-500' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{item.deviceType}</h3>
                            {isComplete && (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {item.itemDescription}
                          </p>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{item.itemCategory}</Badge>
                            <Badge variant="secondary">{item.itemNature}</Badge>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Progress: </span>
                            <span className={scannedCount >= item.quantity ? 'text-green-600' : 'text-yellow-600'}>
                              {scannedCount} / {item.quantity} scanned
                            </span>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleOpenScanDialog(item)}
                          disabled={isComplete}
                          size="sm"
                        >
                          {isComplete ? 'Complete' : 'Scan'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Right: Scanned Items */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Scanned Items ({scannedItems.length})</h2>
            <div className="space-y-3">
              {scannedItems.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <PackageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No items scanned yet</p>
                  </CardContent>
                </Card>
              ) : (
                scannedItems.map((item, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{item.deviceType}</h3>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {item.manufactureSerialNumber && (
                              <div>Manufacture S/N: {item.manufactureSerialNumber}</div>
                            )}
                            {item.qrCodeSerialNumber && (
                              <div>QR Code S/N: {item.qrCodeSerialNumber}</div>
                            )}
                            {item.xlinkSerialNumber && (
                              <div>Xlink S/N: {item.xlinkSerialNumber}</div>
                            )}
                            {item.cradleSerialNumber && (
                              <div>Cradle S/N: {item.cradleSerialNumber}</div>
                            )}
                            {item.chargerSerialNumber && (
                              <div>Charger S/N: {item.chargerSerialNumber}</div>
                            )}
                            <div className="flex gap-2 mt-2">
                              <Badge variant={item.itemStatus === 'Functional' ? 'default' : 'destructive'}>
                                {item.itemStatus}
                              </Badge>
                              <Badge variant="outline">{item.overallCondition}</Badge>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveScannedItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSubmitStockCount}
            disabled={isSubmitting || scannedItems.length === 0}
            size="lg"
          >
            {isSubmitting ? 'Submitting...' : `Submit Stock Count (${scannedItems.length} items)`}
          </Button>
        </div>

        {/* Scanning Dialog */}
        <Dialog open={showScanDialog} onOpenChange={setShowScanDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Scan Item: {selectedCartItem?.deviceType}</DialogTitle>
              <DialogDescription>
                Scan serial numbers and capture item details
                {selectedCartItem && ` (${getScannedCountForItem(selectedCartItem.id)} of ${selectedCartItem.quantity} scanned)`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Required Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="itemStatus">Item Status *</Label>
                  <Select
                    value={scanFormData.itemStatus}
                    onValueChange={(value) => setScanFormData({ ...scanFormData, itemStatus: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Functional">Functional</SelectItem>
                      <SelectItem value="Faulty">Faulty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="overallCondition">Overall Condition *</Label>
                  <Select
                    value={scanFormData.overallCondition}
                    onValueChange={(value) => setScanFormData({ ...scanFormData, overallCondition: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Fair">Fair</SelectItem>
                      <SelectItem value="Poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Fault Reason (conditional) */}
              {scanFormData.itemStatus === 'Faulty' && (
                <div className="space-y-2">
                  <Label htmlFor="faultReason">Fault Reason</Label>
                  <Input
                    id="faultReason"
                    value={scanFormData.faultReason || ''}
                    onChange={(e) => setScanFormData({ ...scanFormData, faultReason: e.target.value })}
                    placeholder="Describe the fault"
                  />
                </div>
              )}

              <Separator />

              {/* Serial Number Fields */}
              {selectedCartItem?.itemNature?.toLowerCase().includes('serial') ? (
                <>
                  {isCashConnect(selectedCartItem) ? (
                    <>
                      {/* Cash Connect: QR Code Scan */}
                      <p className="text-sm font-semibold text-center">Scan Cash Connect QR Code</p>

                      <div className="space-y-2">
                        <Label htmlFor="qrScan">QR Code Scan (Comma-separated format)</Label>
                        <Input
                          id="qrScan"
                          value={qrScanInput}
                          onChange={(e) => handleQrScanChange(e.target.value)}
                          placeholder="Scan QR code here"
                          autoFocus
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="itemCode">Item Code</Label>
                        <Input
                          id="itemCode"
                          value={scanFormData.scannedItemCode || ''}
                          onChange={(e) => setScanFormData({ ...scanFormData, scannedItemCode: e.target.value })}
                          placeholder="Auto-populated from scan"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="qrCodeSerial">QR Code Serial Number</Label>
                        <Input
                          id="qrCodeSerial"
                          value={scanFormData.qrCodeSerialNumber || ''}
                          onChange={(e) => setScanFormData({ ...scanFormData, qrCodeSerialNumber: e.target.value })}
                          placeholder="Auto-populated from scan or enter manually"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* All other business lines: Individual serial number fields */}
                      <p className="text-sm font-semibold text-center">Scan Device Serial Numbers</p>

                      <div className="space-y-2">
                        <Label htmlFor="manufactureSerial">Manufacture Serial Number</Label>
                        <Input
                          id="manufactureSerial"
                          value={scanFormData.manufactureSerialNumber || ''}
                          onChange={(e) => setScanFormData({ ...scanFormData, manufactureSerialNumber: e.target.value })}
                          placeholder="Scan or enter manufacture serial"
                          autoFocus
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="xlinkSerial">Xlink Serial Number</Label>
                        <Input
                          id="xlinkSerial"
                          value={scanFormData.xlinkSerialNumber || ''}
                          onChange={(e) => setScanFormData({ ...scanFormData, xlinkSerialNumber: e.target.value })}
                          placeholder="Scan or enter xlink serial"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cradleSerial">Cradle Serial Number</Label>
                        <Input
                          id="cradleSerial"
                          value={scanFormData.cradleSerialNumber || ''}
                          onChange={(e) => setScanFormData({ ...scanFormData, cradleSerialNumber: e.target.value })}
                          placeholder="Scan or enter cradle serial"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="chargerSerial">Charger Serial Number</Label>
                        <Input
                          id="chargerSerial"
                          value={scanFormData.chargerSerialNumber || ''}
                          onChange={(e) => setScanFormData({ ...scanFormData, chargerSerialNumber: e.target.value })}
                          placeholder="Scan or enter charger serial"
                        />
                      </div>
                    </>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center">
                  Non-serialised item - no serial numbers required
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowScanDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddScannedItem}>Add to Scanned Items</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Success Modal */}
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
                Stock Count Submitted Successfully
              </DialogTitle>
              <DialogDescription>
                Your stock count has been recorded with {scannedItems.length} items.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={handleSuccessClose}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default StockCountsCart;
