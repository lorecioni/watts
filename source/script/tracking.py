'''Pedestrian tracking utilities for generating annotation proposals'''
import cv2
import numpy as np
import os
import random
import configparser

'''Pedestrian tracker configuration'''
config = configparser.RawConfigParser()
baseDir = os.path.dirname(__file__)
configPath = baseDir + '/trackingconf.conf'
config.read(configPath)
section = 'options'

try: 
    FRAMES_PATH = config.get(section, 'FRAMES_PATH')
except Exception:
    FRAMES_PATH = '/frames/'
    
try: 
    FRAMES_SUB_PATH = config.get(section, 'FRAMES_SUB_PATH')
except Exception:
    FRAMES_SUB_PATH = ''

#Tracking options
try: 
    USE_MOTION = config.getboolean(section, 'USE_MOTION')
except Exception:
    USE_MOTION = True
try: 
    USE_PEDESTRIAN_DETECTOR = config.getboolean(section, 'USE_PEDESTRIAN_DETECTOR')
except Exception:
    USE_PEDESTRIAN_DETECTOR = True    
try: 
    USE_KALMAN_FILTER = config.getboolean(section, 'USE_KALMAN_FILTER')
except Exception:
    USE_KALMAN_FILTER = True      

#Training size for MOG background substractor
try: 
    TRAIN_SIZE = config.getint(section, 'TRAIN_SIZE')
except Exception:
    TRAIN_SIZE = 40
    
#Tolerance for considering two bb similar
try: 
    TOLERANCE = config.getfloat(section, 'TOLERANCE')
except Exception:
    TOLERANCE = 1.5

try: 
    BOUNDING_BOX_TOLERANCE = config.getfloat(section, 'BOUNDING_BOX_TOLERANCE')
except Exception:
    BOUNDING_BOX_TOLERANCE = 0.5
    
#Padding for the current window
try: 
    WINDOW_OFFSET = config.getint(section, 'WINDOW_OFFSET')
except Exception:
    WINDOW_OFFSET = 150

#Showing result frames
try: 
    DISPLAY_RESULT = config.getboolean(section, 'DISPLAY_RESULT')
except Exception:
    DISPLAY_RESULT = False    
try: 
    DISPLAY_TEXT = config.getboolean(section, 'DISPLAY_TEXT')
except Exception:
    DISPLAY_TEXT = False  

#Minimum and maximum bounding box dimension
try: 
    MIN_BB_WIDTH = config.getint(section, 'MIN_BB_WIDTH')
except Exception:
    MIN_BB_WIDTH = 30
try: 
    MIN_BB_HEIGHT = config.getint(section, 'MIN_BB_HEIGHT')
except Exception:
    MIN_BB_HEIGHT = 50

#HOG people detector configuration
try: 
    HOG_STRIDE = config.getint(section, 'HOG_STRIDE')
except Exception:
    HOG_STRIDE = 8
try: 
    HOG_PADDING = config.getint(section, 'HOG_PADDING')
except Exception:
    HOG_PADDING = 8
try: 
    HOG_SCALE = config.getfloat(section, 'HOG_SCALE')
except Exception:
    HOG_SCALE = 1.05

FONT = cv2.FONT_HERSHEY_SIMPLEX
FONT_SIZE = 1

LEGEND_POSITION_X = 50
LEGEND_POSITION_Y = 50

'''Pedestrian tracking class'''
class PedestrianTracking:
    
    '''Initializing of the pedestrian tracker'''
    def __init__(self, previousFrames, nextFrames, camera):
        path = os.path.abspath(FRAMES_PATH)
            
        #Retrieving frames list
        imagesPath = os.path.join(path, str(camera) + '/')
        
        if len(FRAMES_SUB_PATH) > 0:
            imagesPath += FRAMES_SUB_PATH + '/'

        self.images = [os.path.join(imagesPath, f) 
            for f in os.listdir(os.path.abspath(imagesPath)) 
            if os.path.isfile(os.path.join(imagesPath, f))]
                
        self.nextImages = []
        self.previousImages = []
        self.previosuBB = []
        for i in range(len(previousFrames)):
            self.previousImages.append(os.path.join(path, previousFrames[i][0]))
            self.previosuBB.append(previousFrames[i][1])
        for j in range(len(nextFrames)):
            self.nextImages.append(os.path.join(path, nextFrames[j]))     
        self.setup()
         
    '''Initializing of the pedestrian tracker'''
    def setup(self):
        #Train background substractor
        self.trainBackgroundSubstractor()
        #Initializing HOG descriptor for people detection
        self.hog = cv2.HOGDescriptor()
        self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())

        #Set up the Kalman Filter
        self.kalman = cv2.KalmanFilter(4, 2, 0)
        self.kalman.measurementMatrix = np.array([[1,0,0,0],[0,1,0,0]],np.float32)
        self.kalman.transitionMatrix = np.array([[1,0,1,0],[0,1,0,1],[0,0,1,0],[0,0,0,1]],np.float32)
        self.kalman.processNoiseCov = np.array([[1e-2,0,0,0],[0,1e-2,0,0],[0,0,20,0],[0,0,0,20]],np.float32)
        self.kalman.measurementNoiseCov = self.kalman.measurementNoiseCov * 2
        self.kalman.errorCovPre = np.identity(4, np.float32) 

        self.prediction = np.zeros((2,1), np.float32)
        self.measurement = np.zeros((2,1), np.float32)

        #Elaborating previous frames (generating Kalman history)
        for k in range(len(self.previousImages)):
            frame = cv2.imread(self.previousImages[k])   
            #Current bounding box
            self.track_window = self.previosuBB[k]
            x, y , w, h = self.track_window 
            #Adding previous state to the kalman filter
            if k == 0:
                self.kalman.statePre = np.array([[np.float32(x + w/2)], [np.float32(y + h/2)], [0.], [0.]], np.float32)               #else:    
            self.measurement = np.array([[np.float32(x + w/2)], [np.float32(y + h/2)]])
            self.kalman.correct(self.measurement)

    '''Predicting person position based on motion, people detection and Kalman filter'''
    def predict(self):
        out = []
        for k in range(len(self.nextImages)):
            frame = cv2.imread(self.nextImages[k])
            height, width, channels = frame.shape
            #Generating current window
            self.getCurrentWindow(width, height)        
            (c, r, w, h) = self.window
            roi = frame[r:r+h, c:c+w]  
                
            if USE_MOTION:   
                fgmask = self.bgs.apply(frame) 
                #Mask preprocessing, removing noise
                _, fgmask = cv2.threshold(fgmask, 200, 255, cv2.THRESH_BINARY) 
                
                fgmask = cv2.morphologyEx(fgmask, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2,2)))
                fgmask = cv2.dilate(fgmask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (8,10)))
                fgmask = cv2.morphologyEx(fgmask, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (8,8)))
               # fgmask = cv2.morphologyEx(fgmask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (8,8)))
                image, contours, hierarchy = cv2.findContours(fgmask.copy(),cv2.RETR_TREE,cv2.CHAIN_APPROX_SIMPLE)            
            
            (x, y, w, h) = self.track_window
            (wx, wy, ww, wh) = self.window
            
            if DISPLAY_RESULT:            
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)                    
                
            best_people = None
            best_contour = None
            
            motion_score = 0
            people_detector_score = 0

            if USE_PEDESTRIAN_DETECTOR:
                #Detect people on the current window
                people = self.detectPeople(roi)     
                for person in people:
                    (x, y, w, h) = person
                    
                    #Adjusting detection
                    pad_w, pad_h = int(0.1 * w), int(0.08 * h)
                    p = (wx + x + pad_w, wy + y + pad_h, w - 2*pad_w, h-2*pad_h)
                    intersect, score, ratio = self.boundingBoxIntersect(frame, self.track_window, p)
                    if intersect:
                        if best_people != None:
                            if best_people[1] < score:
                                best_people = (p, score, ratio)
                        else:
                            best_people = (p, score, ratio)
                    
                if DISPLAY_RESULT:
                    if best_people != None:
                        #print('Best person detected: ' + str(best_people[1]))
                        people_detector_score = best_people[1]
                        (x, y, w, h) = best_people[0]
                        cv2.rectangle(frame, (x, y), (x + w, y + h), (255, 0, 0), 2)                            
                        
            if USE_MOTION:
                for c in contours:
                    if cv2.contourArea(c) > 500:
                        rect = cv2.boundingRect(c) 

                        intersect, score, ratio = self.boundingBoxIntersect(frame, self.track_window, rect)
                        if intersect:
                            if best_contour != None:
                                if best_contour[1] < score:
                                    best_contour = (rect, score, ratio)
                            else:
                                best_contour = (rect, score, ratio)
                            
                
                if DISPLAY_RESULT:
                    if best_contour != None:
                        #print('Best contour detected: ' + str(best_contour[1]))
                        motion_score = best_contour[1]
                        (x, y, w, h) = best_contour[0]
                        cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 0, 255), 2)
                            
            
            result = self.track_window
            found = False
            if(best_people != None and best_contour != None and best_people[1] > best_contour[1]):
                if self.inside(best_people[0], best_contour[0]):
                    result = best_people[0]
                else:
                    result = best_contour[0]
                found = True
            elif(best_people != None and best_contour != None and best_people[1] < best_contour[1]):
                result = best_contour[0]
                found = True
            elif(best_people != None and best_contour == None):
                result = best_people[0]
                found = True
            elif(best_people == None and best_contour != None):
                result = best_contour[0]
                found = True

            prediction = self.kalman.predict() 
            (x, y, w, h) = result
            
            if(found):
                #Using people detector/motion   
                if USE_KALMAN_FILTER:      
                    self.measurement = np.array([[np.float32(x + w/2)],[np.float32(y + h/2)]])
                    self.kalman.correct(self.measurement)
                    if DISPLAY_RESULT:
                        cv2.circle(frame, (int (prediction[0]), int(prediction[1])), 4, (0, 153, 255), 4)
                self.track_window = result
            else:
                if USE_KALMAN_FILTER:
                    #Using Kalman prediction
                    self.kalman.statePost = prediction
                    self.track_window = (int(prediction[0] - w/2), int(prediction[1] - h/2), w, h)
                    if DISPLAY_RESULT:
                        cv2.circle(frame, (int (prediction[0]), int(prediction[1])), 4, (0, 153, 255), 4)
                       
            (x, y, w, h) = self.track_window
            obj = {'x' : int(x), 'y' : int(y), 'width' : int(w), 'height': int(h)}
            out.append(obj)
            
            if DISPLAY_TEXT:
                using_kalman = ''
                if (motion_score == 0 and people_detector_score == 0):
                    using_kalman = 'ACTIVE'
    
                cv2.putText(frame, 'previous', (LEGEND_POSITION_X, LEGEND_POSITION_Y), FONT, FONT_SIZE, (0, 255, 0), 1)  
                cv2.putText(frame, 'people detector  {0:.2f}'.format(people_detector_score), (LEGEND_POSITION_X, LEGEND_POSITION_Y + 30), FONT, FONT_SIZE, (255, 0, 0), 1)
                cv2.putText(frame, 'kalman filter ' + using_kalman , (LEGEND_POSITION_X, LEGEND_POSITION_Y + 90), FONT, FONT_SIZE, (0, 153, 255), 1)
                cv2.putText(frame, 'motion {0:.2f}'.format(motion_score), (LEGEND_POSITION_X, LEGEND_POSITION_Y + 60), FONT, FONT_SIZE, (0, 0, 255), 1)
            
            if DISPLAY_RESULT:
                #cv2.rectangle(frame, (x, y), (x + w, y + h), (255, 0, 0), 2)             
                cv2.imshow('img', frame)    
                cv2.waitKey(0)   
                

                     
            
        return out
    
    '''Returns a list of detections of people'''
    def detectPeople(self, frame):
        found, w = self.hog.detectMultiScale(frame, winStride=(HOG_STRIDE, HOG_STRIDE), padding=(HOG_PADDING, HOG_PADDING), scale=HOG_SCALE)
        filtered = []
        for ri, r in enumerate(found):
            for qi, q in enumerate(found):
                if ri != qi and self.inside(r, q):
                    break
                else:
                    if not self.contains(filtered, r):
                        filtered.append(r) 
              
        return filtered

    '''Methods over bounding boxes'''
    def contains(self, list, bb):
        found = False
        rx, ry, rw, rh = bb
        for e in list:
            qx, qy, qw, qh = e
            if(rx == qx and ry == qy and rw == qw and rh == qh):
                found = True
        return found
    
    def inside(self, r, q):
        rx, ry, rw, rh = r
        qx, qy, qw, qh = q
        return rx > qx and ry > qy and rx + rw < qx + qw and ry + rh < qy + qh
    
    def union(self, a, b):
        x = min(a[0], b[0])
        y = min(a[1], b[1])
        w = max(a[0]+a[2], b[0]+b[2]) - x
        h = max(a[1]+a[3], b[1]+b[3]) - y
        return w * h
    
    def intersection(self, a, b):
        x = max(a[0], b[0])
        y = max(a[1], b[1])
        w = min(a[0]+a[2], b[0]+b[2]) - x
        h = min(a[1]+a[3], b[1]+b[3]) - y
        if w<0 or h<0: return 0
        return w * h
    
    
    '''Returning True if two bounding boxes intersect and evaluating score (based on intersect area)'''
    def boundingBoxIntersect(self, frame, r1, r2):
        intersectArea = self.intersection(r1, r2)
        unionArea = self.union(r1, r2)
        score = intersectArea/unionArea
        separate = True if intersectArea <= 0 else False
        
        areaR1 = r1[2] * r1[3]
        areaR2 = r2[2] * r2[3]
        if(areaR1 < areaR2):
            ratio = areaR1 / areaR2
        else:
            ratio = areaR2 / areaR1
        
        if (score < BOUNDING_BOX_TOLERANCE):
            return (False, 0, ratio)
        else:
            return (not separate, score, ratio)
    
    '''Try to ajdust bounding box dimensione based on previous detection'''
    def adjustBoundingBox(self, bb):
        (cx, cy, cw, ch) = self.track_window
        (x, y, w, h) = bb
        (ox, oy, ow, oh) = bb
        if abs(cw - w) > TOLERANCE/2:
            ox, oy, ow = (cx + x)/2, (cy + y)/2, min([cw, w]) + TOLERANCE/4
        if abs(ch - h) > TOLERANCE/2:
            ox, oy, oh = (cx + x)/2, (cy + y)/2, min([ch, h]) + TOLERANCE/4    
        return (int(ox), int(oy), int(ow), int(oh))      
    
    '''Generating current window (bounding box and padding)'''
    def getCurrentWindow(self, maxw, maxh):
        (x, y, w, h) = self.track_window
        if x >= WINDOW_OFFSET:
            x = x - WINDOW_OFFSET
        else:
            x = 0
        if y >= WINDOW_OFFSET:
            y = y - WINDOW_OFFSET
        else:
            y = 0
        if x + w + WINDOW_OFFSET*2 < maxw:
            w = w + WINDOW_OFFSET*2
        else:
            w = w + abs(maxw - (x + w))
        if y + h + WINDOW_OFFSET*2 < maxh:
            h = h + WINDOW_OFFSET*2    
        else:
            h = h + abs(maxh - (y + h))           
        self.window = (x, y, w, h)
         
    '''Train MOG background substractor'''
    def trainBackgroundSubstractor(self):
        self.bgs = cv2.createBackgroundSubtractorMOG2()         
        for i in range(len(self.previousImages)):
            frame = cv2.imread(self.previousImages[i])
            self.bgs.apply(frame)
        for i in range(TRAIN_SIZE):
           # id = random.choice(range(len(self.images)));
            frame = cv2.imread(self.images[i])
            self.bgs.apply(frame)
        for i in range(len(self.nextImages)):
            frame = cv2.imread(self.nextImages[i])
            self.bgs.apply(frame)
        