close all;

load('cameraCalibration2.mat');
frame = imread('/Applications/MAMP/htdocs/watss/calibration/images/camera2.jpg');

imgVanline=HW2I'*[0 0 1]'; % H=H(N).mat
omega=inv(K')*inv(K); %K'=ptzim(N).K'

imgVinfty=inv(omega)*imgVanline;
imgVinfty=imgVinfty/imgVinfty(3);
imgVinfty(3)=1;

p1 = [507 371 1];
p2 = [457 445 1];
p3 = [482 1058 1];
p4 = [213 371 1];
p5 = [203 442 1];


imshow(frame);
hold on;
plot(p1(2),p1(1),'r.','MarkerSize',30);
plot(p2(2),p2(1),'r.','MarkerSize',30);
plot(p3(2),p3(1),'r.','MarkerSize',30);
plot(p4(2),p4(1),'r.','MarkerSize',30);
plot(p5(2),p5(1),'r.','MarkerSize',30);

for mu=0:-0.01:-2.0
    W=eye(3)+(1/(1-mu)-1).*((imgVinfty*imgVanline')./(imgVinfty'*imgVanline));
    hold on;
    P1 = W*[p1(1) size(frame,2)-p1(2) 1]';P1=P1./P1(3);
    plot(size(frame,2)-P1(2),P1(1),'y.','MarkerSize',30);
    P2 = W*[p2(1) size(frame,2)-p2(2) 1]';P2=P2./P2(3);
    plot(size(frame,2)-P2(2),P2(1),'y.','MarkerSize',30);
    P3 = W*[p3(1) size(frame,2)-p3(2) 1]';P3=P3./P3(3);
    plot(size(frame,2)-P3(2),P3(1),'y.','MarkerSize',30);
    P4 = W*[p4(1) size(frame,2)-p4(2) 1]';P4=P4./P4(3);
    plot(size(frame,2)-P4(2),P4(1),'y.','MarkerSize',30);
    P5 = W*[p5(1) size(frame,2)-p5(2) 1]';P5=P5./P5(3);
    plot(size(frame,2)-P5(2),P5(1),'y.','MarkerSize',30);

    mu

   pause;
end
